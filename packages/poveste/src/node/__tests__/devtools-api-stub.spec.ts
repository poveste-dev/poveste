import { init as initLexer, parse as parseModule } from 'es-module-lexer'
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
})
