import type { Context } from '../context.js'
import { describe, expect, it, vi } from 'vitest'
import { jsIdentifier } from '../virtual/codegen.js'

// These generators resolve each plugin's client entry, which only exists once
// that package is built — and `pnpm test` does not build. The paths are not
// what is under test here, so the resolver is stubbed and the generated source
// is what gets asserted.
vi.mock('node:module', () => ({
  createRequire: () => ({ resolve: (request: string) => `/resolved/${request}` }),
}))

const { resolvedSupportPluginsClient } = await import('../virtual/resolved-support-plugins-client.js')
const { resolvedSupportPluginsCollect } = await import('../virtual/resolved-support-plugins-collect.js')

// `id` is part of the plugin API and a third party picks it, so it is not
// enough that poveste's own ids happen to be bare words. An id that needed
// escaping used to emit a module that does not parse, and the syntax error
// surfaced inside generated code its author never wrote (#609).
function contextFactory(id: string): Context {
  return {
    root: process.cwd(),
    supportPlugins: [{ id, moduleName: '@poveste/plugin-vue' }],
  } as Context
}

const GENERATORS = [
  { name: 'client', generate: resolvedSupportPluginsClient },
  { name: 'collect', generate: resolvedSupportPluginsCollect },
]

/** Parseable as a module body, with the dynamic imports defanged. */
function parses(code: string): boolean {
  try {
    // eslint-disable-next-line no-new-func
    void new Function(code.replace(/\bexport const\b/, 'const').replace(/\bimport\(/g, 'Promise.resolve('))
    return true
  }
  catch {
    return false
  }
}

describe('virtual support plugin modules', () => {
  for (const { name, generate } of GENERATORS) {
    describe(name, () => {
      it('quotes a plain id as a string key', () => {
        expect(generate(contextFactory('vue3'))).toContain('"vue3":')
      })

      it('escapes an id that would otherwise close its own quotes', () => {
        const code = generate(contextFactory('it\'s'))

        expect(code).toContain(String.raw`"it's":`)
        expect(parses(code), code).toBe(true)
      })
    })
  }
})

describe('jsIdentifier', () => {
  // The identifier positions quoting cannot rescue: a binding name in a
  // generated module. Rejecting names the value; emitting it produces a syntax
  // error in a module its author never wrote (#609).
  it('accepts a name that is already an identifier', () => {
    expect(jsIdentifier('setupVue3', 'setupFn')).toBe('setupVue3')
    expect(jsIdentifier('_$a1', 'setupFn')).toBe('_$a1')
  })

  it.each([
    ['setup vue', 'a space'],
    ['2setup', 'a leading digit'],
    ['dark-2x', 'a hyphen'],
    ['', 'the empty string'],
  ])('rejects %j (%s) and says what it was', (value) => {
    expect(() => jsIdentifier(value, 'theme.logo key')).toThrow(/theme\.logo key/)
  })
})
