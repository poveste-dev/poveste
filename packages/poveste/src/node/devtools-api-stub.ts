import type { Plugin as VitePlugin } from 'vite'
import { readFile } from 'node:fs/promises'
import { init as initLexer, parse as parseModule } from 'es-module-lexer'

const STUB = '\0poveste:devtools-api'

// Every name 8.x and 9.x export, and all a stub gets when its copy cannot be read:
// none resolves from the importer, as for the vendored pinia under Yarn PnP (#1481).
const PUBLISHED_NAMES = [
  'addCustomCommand',
  'addCustomTab',
  'onDevToolsClientConnected',
  'onDevToolsConnected',
  'removeCustomCommand',
  'setupDevToolsPlugin',
  'setupDevtoolsPlugin',
]

const IDENTIFIER = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/u

// Names a module can export but not declare, as `export function default() {}` cannot be.
const RESERVED = new Set('arguments await break case catch class const continue debugger default delete do else enum eval export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield'.split(' '))

/**
 * `@vue/devtools-api` is the registration side of the Vue Devtools browser
 * extension. pinia and vue-router import it statically, so it is in every
 * book's graph, and `__VUE_PROD_DEVTOOLS__` — which auto-props needs — keeps
 * their calls live past tree-shaking. What it would register for a reader of a
 * published book is Poveste's own stores, so the 200 KB buys them nothing
 * (#791).
 *
 * One rule reaches both copies now. A consumer's stories resolve their own
 * pinia and Poveste's stores resolve its own, and since #347 both import
 * `@vue/devtools-api` by name rather than one of them carrying it inside a
 * prebundled chunk — so the name is the whole of it.
 *
 * `apply: 'build'` keeps dev registering. Note that it is not what makes the
 * real module reach a dev browser: Vite's dep optimiser bakes it into a chunk
 * before this plugin sees the id, and flipping this to `'serve'` leaves dev
 * serving it regardless. Measured while rewriting the spec that used to claim
 * otherwise.
 */
export function devtoolsApiStubPlugin(): VitePlugin {
  // One stub per installed copy, since two copies can export different names. The
  // copy's path stays out of the id, which a built book must not carry (#1383).
  const stubOf = new Map<string, string>()
  const copyOf = new Map<string, string>()

  return {
    name: 'poveste-devtools-api-stub',
    apply: 'build',
    enforce: 'pre',

    async resolveId(id, importer, options) {
      if (id !== '@vue/devtools-api') {
        return undefined
      }
      const copy = await this.resolve(id, importer, { ...options, skipSelf: true }).catch(() => null)
      if (!copy || copy.external) {
        return STUB
      }
      let stub = stubOf.get(copy.id)
      if (!stub) {
        stub = `${STUB}:${stubOf.size + 1}`
        stubOf.set(copy.id, stub)
        copyOf.set(stub, copy.id)
      }
      return stub
    },

    async load(id) {
      if (id !== STUB && !copyOf.has(id)) {
        return undefined
      }
      const names = new Set(PUBLISHED_NAMES)
      const copy = copyOf.get(id)
      if (copy) {
        const resolve = (source: string, importer: string) => this.resolve(source, importer, { skipSelf: true }).catch(() => null)
        await readExportNames(copy, resolve, names, new Set())
      }
      // Not an empty module: pinia and vue-router *call* these, so each export
      // has to exist or the book throws where it used to register nothing.
      return stubModule(names)
    },
  }
}

/**
 * An empty function declared under each name, which Rolldown sees does nothing,
 * so it drops each call and the callback handed to it: pinia's, vue-router's and
 * vue-i18n's devtools code. One function aliased to every name kept them all,
 * 16 KB of `examples/vue`'s `vendor` (#1694).
 */
function stubModule(names: Set<string>) {
  const declared = [...names].filter(name => !RESERVED.has(name))
  const aliased = [...names].filter(name => RESERVED.has(name))
  let code = declared.map(name => `export function ${name}() {}\n`).join('')
  if (aliased.length > 0) {
    let noop = 'noop'
    while (names.has(noop)) {
      noop = `_${noop}`
    }
    code += `function ${noop}() {}\nexport { ${aliased.map(name => `${noop} as ${name}`).join(', ')} }\n`
  }
  return code
}

type Resolve = (source: string, importer: string) => Promise<{ id: string, external?: boolean | string } | null>

/** The names a module exports, following `export * from` into what it re-exports. */
async function readExportNames(file: string, resolve: Resolve, names: Set<string>, seen: Set<string>) {
  if (seen.has(file)) {
    return
  }
  seen.add(file)
  await initLexer()
  const code = await readFile(file, 'utf8').catch(() => '')
  let exports: ReturnType<typeof parseModule>[1]
  try {
    exports = parseModule(code)[1]
  }
  catch {
    // A file the lexer refuses: the published names stand. CommonJS needs no
    // case of its own, since it lexes as exporting nothing.
    return
  }
  for (const entry of exports) {
    if (entry.typeOnly) {
      continue
    }
    if (entry.type !== 'reexport-all') {
      if (IDENTIFIER.test(entry.name)) {
        names.add(entry.name)
      }
      continue
    }
    const target = await resolve(entry.from, file)
    if (target && !target.external) {
      await readExportNames(target.id, resolve, names, seen)
    }
  }
}
