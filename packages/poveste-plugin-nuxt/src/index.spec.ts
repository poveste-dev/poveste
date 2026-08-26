import { describe, expect, it, vi } from 'vitest'
// @ts-expect-error plain runtime module, no types
import { __povesteTolerant } from '../runtime/tolerant-plugins.mjs'
import { isPluginExcluded, wrapPluginsForTolerantBoot } from './index'

const I18N_DEFAULT = /[\\/]@nuxtjs[\\/]i18n[\\/].*[\\/]plugins[\\/]/

describe('isPluginExcluded', () => {
  const i18nSrc = '/app/node_modules/@nuxtjs/i18n/dist/runtime/plugins/i18n.js'

  it('matches a resolved src against a substring pattern', () => {
    expect(isPluginExcluded(i18nSrc, ['@nuxtjs/i18n'])).toBe(true)
  })

  it('matches a resolved src against a RegExp pattern', () => {
    expect(isPluginExcluded(i18nSrc, [I18N_DEFAULT])).toBe(true)
  })

  it('returns false when no pattern matches', () => {
    expect(isPluginExcluded('/app/plugins/analytics.client.ts', ['@nuxtjs/i18n', I18N_DEFAULT])).toBe(false)
  })

  it('stays stateless across calls with a global RegExp', () => {
    // A /g pattern driven by `.test()` alternates true/false on repeat calls as
    // its `lastIndex` advances; `.match()` keeps the answer stable.
    const global = /i18n/g

    expect(isPluginExcluded(i18nSrc, [global])).toBe(true)
    expect(isPluginExcluded(i18nSrc, [global])).toBe(true)
  })
})

describe('wrapPluginsForTolerantBoot', () => {
  it('maps the exported plugin array through the guard and imports it', () => {
    const source = [
      `import { default as i18n_ab12 } from '../node_modules/@nuxtjs/i18n/dist/runtime/plugins/i18n.js'`,
      `import { default as ssr_cd34 } from '../plugins/ssr.js'`,
      `export default [i18n_ab12, ssr_cd34]`,
    ].join('\n')

    const result = wrapPluginsForTolerantBoot(source)

    expect(result).toContain(`import { __povesteTolerant } from '#build/poveste/tolerant-plugins.mjs'`)
    expect(result).toContain(`export default [i18n_ab12, ssr_cd34].map(__povesteTolerant)`)
  })

  it('wraps an array that spans multiple lines', () => {
    const source = `import a from 'a'\nexport default [\n  a,\n]`

    expect(wrapPluginsForTolerantBoot(source)).toContain('].map(__povesteTolerant)')
  })

  it('returns the source untouched when the array shape is absent', () => {
    const source = `export const plugins = []`

    expect(wrapPluginsForTolerantBoot(source)).toBe(source)
  })
})

describe('__povesteTolerant', () => {
  it('passes a healthy plugin\'s provides through', async () => {
    const provides = { provide: { $greet: () => 'hi' } }
    const plugin = vi.fn(async () => provides)

    const result = await __povesteTolerant(plugin)({})

    expect(result).toBe(provides)
    expect(plugin).toHaveBeenCalledOnce()
  })

  it('swallows a setup error and warns instead of aborting the boot', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plugin = Object.assign(async () => {
      throw new Error('needs the full Nuxt runtime')
    }, { _name: 'auth:session' })

    await expect(__povesteTolerant(plugin)({})).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('auth:session'), expect.any(Error))

    warn.mockRestore()
  })

  it('preserves plugin metadata so ordering and dependencies are unchanged', () => {
    const plugin = Object.assign(() => {}, { _name: 'analytics', order: -20, dependsOn: ['auth:session'] })

    const wrapped = __povesteTolerant(plugin)

    expect(wrapped._name).toBe('analytics')
    expect(wrapped.order).toBe(-20)
    expect(wrapped.dependsOn).toEqual(['auth:session'])
  })

  it('leaves a non-function plugin entry untouched', () => {
    const entry = { some: 'object' }

    expect(__povesteTolerant(entry)).toBe(entry)
  })
})
