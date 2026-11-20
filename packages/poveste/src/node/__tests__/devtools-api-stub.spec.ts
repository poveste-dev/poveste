import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { init as initLexer, parse as parseModule } from 'es-module-lexer'
import { parseAst } from 'vite'
import { describe, expect, it } from 'vitest'
import { devtoolsApiStubPlugin } from '../devtools-api-stub.js'

// Every name 8.2.1 exports, which 9.0's are a subset of.
const PUBLISHED_NAMES = [
  'addCustomCommand',
  'addCustomTab',
  'onDevToolsClientConnected',
  'onDevToolsConnected',
  'removeCustomCommand',
  'setupDevToolsPlugin',
  'setupDevtoolsPlugin',
]

describe('devtoolsApiStubPlugin', () => {
  // Yarn PnP gives the vendored pinia no `@vue/devtools-api` to resolve (#1481).
  it('exports every published name when the importer cannot resolve the package', async () => {
    const plugin = devtoolsApiStubPlugin()
    const resolveId = plugin.resolveId as (this: unknown, ...args: unknown[]) => Promise<string>
    const load = plugin.load as (this: unknown, id: string) => Promise<string>

    const stub = await resolveId.call({ resolve: async () => null }, '@vue/devtools-api', '/book/pinia.js', {})
    const code = await load.call({}, stub)
    await initLexer()

    expect(parseModule(code)[1].map(entry => 'name' in entry && entry.name).sort()).toEqual(PUBLISHED_NAMES)
  })

  // Each name is declared as its own function so a bundler can drop its calls
  // (#1694), and a name like `default` can be exported but not declared.
  it('still exports a name no function can be declared under', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'poveste-devtools-'))
    try {
      const copy = path.join(dir, 'index.js')
      writeFileSync(copy, 'export default {}\nexport function noop() {}\n')
      const plugin = devtoolsApiStubPlugin()
      const resolveId = plugin.resolveId as (this: unknown, ...args: unknown[]) => Promise<string>
      const load = plugin.load as (this: unknown, id: string) => Promise<string>
      const context = { resolve: async () => ({ id: copy }) }

      const stub = await resolveId.call(context, '@vue/devtools-api', '/book/pinia.js', {})
      const code = await load.call(context, stub)
      await initLexer()

      expect(() => parseAst(code)).not.toThrow()
      expect(parseModule(code)[1].map(entry => 'name' in entry && entry.name).sort()).toEqual([...PUBLISHED_NAMES, 'default', 'noop'].sort())
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
