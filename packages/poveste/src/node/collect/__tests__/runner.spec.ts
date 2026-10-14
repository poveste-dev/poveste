import type { EvaluatedModuleNode } from 'vite/module-runner'
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, onTestFinished } from 'vitest'
import { tempDir } from '../../__tests__/temp-dir.js'
import { createRunner, filenameOf, globalsFromExternals } from '../runner.ts'

/** Only the two fields `filenameOf` reads. */
function node(id: string, file?: string): Readonly<EvaluatedModuleNode> {
  return { id, file } as unknown as EvaluatedModuleNode
}

// macOS reports `/var` and hands back `/private/var`, which `existsSync` accepts
// and a path comparison does not.
function tempRoot() {
  const dir = tempDir(join(tmpdir(), 'poveste-runner-'))
  onTestFinished(() => dir.remove())
  return realpathSync(dir.path)
}

describe('the file a CJS module is told it is', () => {
  it('takes a path that exists', () => {
    const root = tempRoot()
    const real = join(root, 'index.js')
    writeFileSync(real, '')

    expect(filenameOf(node(real, real), root)).toBe(real)
  })

  /*
   * The defect. A Vite id is root-relative, so `/node_modules/vue/index.js` is an
   * id and not a path that exists — and `isAbsolute` says true of it, which is what
   * the old predicate asked. The module then got that as its `__filename`, and its
   * own `require('./dist/vue.cjs.prod.js')` resolved under the filesystem root
   * (#1048).
   */
  it('re-roots an id that only looks absolute', () => {
    const root = tempRoot()
    mkdirSync(join(root, 'node_modules', 'vue'), { recursive: true })
    writeFileSync(join(root, 'node_modules', 'vue', 'index.js'), '')

    const id = '/node_modules/vue/index.js'

    expect(filenameOf(node(id, id), root)).toBe(join(root, id))
  })

  // Measured over two books, `file` was `cleanUrl(id)` on all 1360 calls and a
  // resolved path on none. Trusting it because it is set is what made the first
  // attempt at this fix no fix at all.
  it('does not trust `file` merely for being set', () => {
    const root = tempRoot()

    expect(filenameOf(node('/node_modules/gone/index.js', '/node_modules/gone/index.js'), root))
      .toBe(join(root, 'virtual-module'))
  })

  // The Vite root is `server.config.root` and the process's directory is not it,
  // except when a consumer happens to run poveste from the directory Vite is
  // rooted at. Most modules in a book are found through this branch.
  it('re-roots against the Vite root rather than the working directory', () => {
    const root = tempRoot()
    const elsewhere = tempRoot()
    mkdirSync(join(root, 'node_modules', 'vue'), { recursive: true })
    writeFileSync(join(root, 'node_modules', 'vue', 'index.js'), '')
    mkdirSync(join(elsewhere, 'node_modules', 'vue'), { recursive: true })
    writeFileSync(join(elsewhere, 'node_modules', 'vue', 'index.js'), '')

    const cwd = process.cwd()
    process.chdir(elsewhere)
    try {
      expect(filenameOf(node('/node_modules/vue/index.js'), root))
        .toBe(join(root, 'node_modules', 'vue', 'index.js'))
    }
    finally {
      process.chdir(cwd)
    }
  })

  // `/@fs/` is Vite's escape hatch for a file outside the root. It never arrives
  // prefixed here — `normalizeModuleId` strips it server-side — so an outside-root
  // dependency is a plain absolute path, which is 81 of the Quasar book's modules.
  it('takes an outside-root dependency as the absolute path it arrives as', () => {
    const root = tempRoot()
    const store = tempRoot()
    const dep = join(store, 'quasar', 'src', 'plugins', 'screen', 'Screen.js')
    mkdirSync(join(store, 'quasar', 'src', 'plugins', 'screen'), { recursive: true })
    writeFileSync(dep, '')

    expect(filenameOf(node(dep, dep), root)).toBe(dep)
  })

  it('falls back for a module with no file on disk at all', () => {
    const root = tempRoot()

    expect(filenameOf(node('\0virtual:poveste-stories'), root)).toBe(join(root, 'virtual-module'))
  })

  it('prefers `file` over `id` when both name something', () => {
    const dir = tempRoot()
    const file = join(dir, 'real.js')
    const other = join(dir, 'other.js')
    writeFileSync(file, '')
    writeFileSync(other, '')

    expect(filenameOf(node(other, file), dir)).toBe(file)
  })

  it('drops a query or hash before looking', () => {
    const dir = tempRoot()
    const file = join(dir, 'dep.js')
    writeFileSync(file, '')

    expect(filenameOf(node(`${file}?v=1`, `${file}?v=1`), dir)).toBe(file)
  })
})

/** Runs `code` as the module server would hand it over, and returns its exports. */
async function evaluate(code: string, root = tempRoot()): Promise<Record<string, unknown>> {
  const file = join(root, 'module.js')
  writeFileSync(file, '')
  // The two questions a runner asks its server: which modules are Node's own, and what a module's code is.
  const runner = createRunner(async name => name === 'fetchModule' ? { code, file, id: file, url: file, invalidate: false } : [], root)
  onTestFinished(() => runner.close())
  return runner.import(file)
}

const EXPORT_VALUE = 'Object.defineProperty(__vite_ssr_exports__, "value", { enumerable: true, value })'

// The body of an inlined module ran in the scope of the function that hands it
// `require`, `exports`, `module`, `__filename` and `__dirname`, so a top-level
// `const` of any of those names was a redeclaration: a syntax error before a
// line ran, in every story of the book. `const require = createRequire(…)` and
// `const __dirname = dirname(fileURLToPath(…))` are how ESM spells them (#1301).
describe('an inlined module that declares a name the runner also provides', () => {
  it.for(['require', 'exports', 'module', '__filename', '__dirname'])('may declare `%s` at its top level', async (name) => {
    const { value } = await evaluate(`const ${name} = 'mine'\nconst value = ${name}\n${EXPORT_VALUE}`)

    expect(value).toBe('mine')
  })

  it('may declare it with `let` or as a function too', async () => {
    const { value } = await evaluate(`let __dirname = 'mine'\nfunction require() { return 'also mine' }\nconst value = [__dirname, require()]\n${EXPORT_VALUE}`)

    expect(value).toEqual(['mine', 'also mine'])
  })
})

describe('an inlined module that ends in a line comment', () => {
  // As transformed code does, with its source map.
  it('still runs', async () => {
    const { value } = await evaluate(`const value = 'ran'\n${EXPORT_VALUE}\n//# sourceMappingURL=data:application/json;base64,e30=`)

    expect(value).toBe('ran')
  })
})

describe('an inlined module that only reads those names', () => {
  it('still gets a `require`, its own path and a `module` to export through', async () => {
    const root = tempRoot()

    const { value } = await evaluate(`const value = [typeof require, __filename, __dirname, typeof module.exports]\n${EXPORT_VALUE}`, root)

    // Vite's runner writes a module's path with forward slashes, on Windows too.
    const slashed = (path: string) => path.replaceAll('\\', '/')
    expect(value).toEqual(['function', slashed(join(root, 'module.js')), slashed(root), 'object'])
  })

  it('still exports what it assigns to `module.exports`', async () => {
    const exported = await evaluate(`module.exports = { answer: 42 }`)

    expect(exported['default']).toEqual({ answer: 42 })
    expect(exported['answer']).toBe(42)
  })
})

// The worker's reset between stories keeps these. Vue's development build sets
// `__VUE_HMR_RUNTIME__` on import, and once deleted nothing set it again (#1320).
describe('the globals a module adds while it is first run', () => {
  /** A fresh global name per test, so no earlier run has recorded it. */
  function globalName() {
    const name = `__poveste_runner_spec_${Math.random().toString(36).slice(2)}`
    onTestFinished(() => {
      delete (globalThis as Record<string, unknown>)[name]
    })
    return name
  }

  it('are recorded when Node runs the module, externalised', async () => {
    const root = tempRoot()
    const name = globalName()
    const file = join(root, 'external.mjs')
    writeFileSync(file, `globalThis.${name} = 'installed'\n`)
    const runner = createRunner(async request => request === 'fetchModule' ? { externalize: pathToFileURL(file).href, type: 'module' } : [], root)
    onTestFinished(() => runner.close())

    await runner.import(file)

    expect(globalsFromExternals.has(name)).toBe(true)
  })

  it('are not recorded when the runner evaluates the module, inlined', async () => {
    const name = globalName()

    await evaluate(`globalThis.${name} = 'set'`)

    expect(globalsFromExternals.has(name)).toBe(false)
  })
})
