import { describe, expect, it } from 'vitest'
import { globalsFromDefine } from '../collect/define-globals.js'

describe('globalsFromDefine', () => {
  it('passes through a value a plugin already resolved', () => {
    expect(globalsFromDefine({ __VUE_PROD_DEVTOOLS__: false })).toEqual({ __VUE_PROD_DEVTOOLS__: false })
  })

  // The trap: Vite `define` values are expression source, so a user's `'false'`
  // arrives as a string. Seeding it verbatim makes the flag truthy — the opposite
  // of what was asked for, and silent.
  it('parses a string literal rather than seeding a truthy string', () => {
    expect(globalsFromDefine({ __VUE_I18N_LEGACY_API__: 'false' })).toEqual({ __VUE_I18N_LEGACY_API__: false })
  })

  it('handles the mixed shapes one resolved config really contains', () => {
    const define = {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_I18N_FULL_INSTALL__: 'true',
      __INTLIFY_PROD_DEVTOOLS__: 'false',
    }

    expect(globalsFromDefine(define)).toEqual({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_I18N_FULL_INSTALL__: true,
      __INTLIFY_PROD_DEVTOOLS__: false,
    })
  })

  it('parses non-boolean literals too', () => {
    expect(globalsFromDefine({ __BUILD__: '"1.2.3"', __COUNT__: '42', __OPTS__: '{"a":1}' }))
      .toEqual({ __BUILD__: '1.2.3', __COUNT__: 42, __OPTS__: { a: 1 } })
  })

  // A member expression cannot be a global binding, and evaluating arbitrary
  // expressions is not something collection should do.
  it('skips keys that are not identifiers', () => {
    expect(globalsFromDefine({ 'process.env.NODE_ENV': '"production"' })).toEqual({})
  })

  // A browser-targeted config shimming a Node global is a real shape, and seeding it
  // would replace the collection worker's own `process` — a failure surfacing nowhere
  // near the config that caused it.
  it.each(['process', 'global', 'console', 'Buffer', 'globalThis'])('refuses to seed %s', (key) => {
    expect(globalsFromDefine({ [key]: '{}' })).toEqual({})
  })

  it('refuses an identifier that is not flag-shaped', () => {
    expect(globalsFromDefine({ MY_FEATURE: 'true', _private: '1', __lowercase__: '1' })).toEqual({})
  })

  it('accepts every flag a real Vue + vue-i18n config produces', () => {
    const real = {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      __VUE_I18N_FULL_INSTALL__: 'true',
      __VUE_I18N_LEGACY_API__: 'false',
      __INTLIFY_PROD_DEVTOOLS__: 'false',
    }

    expect(Object.keys(globalsFromDefine(real))).toHaveLength(6)
  })

  it('skips a value that is not a literal rather than guessing at it', () => {
    expect(globalsFromDefine({ __WHEN__: 'Date.now()' })).toEqual({})
  })

  it('survives a config with no define at all', () => {
    expect(globalsFromDefine(undefined)).toEqual({})
  })
})
