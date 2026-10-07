import type { EvaluatedModuleNode } from 'vite/module-runner'
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it, onTestFinished } from 'vitest'
import { tempDir } from '../../__tests__/temp-dir.js'
import { filenameOf } from '../runner.ts'

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
