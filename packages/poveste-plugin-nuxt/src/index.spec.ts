import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
// @ts-expect-error plain runtime module, no types
import { __povesteTolerant } from '../runtime/tolerant-plugins.mjs'
import { withoutIgnoredPlugins } from './ignored-plugins'
import { HstNuxt, isPluginExcluded, wrapPluginsForTolerantBoot, wrapPluginTemplates } from './index'

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
    expect(result).toContain(`export default [i18n_ab12, ssr_cd34].map((plugin, index) => __povesteTolerant(plugin, ["../node_modules/@nuxtjs/i18n/dist/runtime/plugins/i18n.js","../plugins/ssr.js"][index]))`)
  })

  it('wraps an array that spans multiple lines', () => {
    const source = `import a from 'a'\nexport default [\n  a,\n]`

    expect(wrapPluginsForTolerantBoot(source)).toContain('].map((plugin, index) => __povesteTolerant(plugin, ["a"][index]))')
  })

  it('returns the source untouched when the array shape is absent', () => {
    const source = `export const plugins = []`

    expect(wrapPluginsForTolerantBoot(source)).toBe(source)
  })

  // The form Nuxt writes today: a default import per plugin, by absolute path.
  it('hands each plugin the path it was imported from, in the array\'s order', () => {
    const source = `import b_2 from "/app/plugins/b.ts";\nimport a_1 from "/app/plugins/a.ts";\nexport default [a_1, b_2]`

    expect(wrapPluginsForTolerantBoot(source)).toContain('__povesteTolerant(plugin, ["/app/plugins/a.ts","/app/plugins/b.ts"][index])')
  })

  it('writes those paths from the project root, not from the disk\'s', () => {
    const source = `import a_1 from "/home/me/app/plugins/a.ts";\nimport i18n_2 from "/home/me/app/node_modules/@nuxtjs/i18n/dist/runtime/plugins/i18n.js";\nexport default [a_1, i18n_2]`

    expect(wrapPluginsForTolerantBoot(source, '/home/me/app')).toContain('["plugins/a.ts","node_modules/@nuxtjs/i18n/dist/runtime/plugins/i18n.js"][index]')
  })

  // The acceptance in #1063, through the file a book actually loads: two
  // plugins written `defineNuxtPlugin(() => { throw … })` each warn, and a
  // reader can tell the two warnings apart.
  it('makes two unnamed plugins that throw warn with two different lines', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'poveste-nuxt-plugins-'))
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }))
    // Through a `defineNuxtPlugin` of its own, as a plugin file is written: the
    // arrow is an argument, so it has no name to infer.
    const unnamed = `const defineNuxtPlugin = plugin => plugin\nexport default defineNuxtPlugin(() => { throw new Error('needs a server') })\n`
    writeFileSync(join(dir, 'analytics.mjs'), unnamed)
    writeFileSync(join(dir, 'session.mjs'), unnamed)
    // Relative, so the same text is a valid import on Windows, where a path has backslashes.
    const generated = `import analytics_1 from "./analytics.mjs";\nimport session_2 from "./session.mjs";\nexport default [analytics_1, session_2]`
    writeFileSync(join(dir, 'plugins.client.mjs'), wrapPluginsForTolerantBoot(generated)
      .replace('#build/poveste/tolerant-plugins.mjs', pathToFileURL(join(import.meta.dirname, '../runtime/tolerant-plugins.mjs')).href))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())

    const { default: plugins } = await import(/* @vite-ignore */ pathToFileURL(join(dir, 'plugins.client.mjs')).href)
    for (const plugin of plugins) {
      await plugin({})
    }

    const lines = warn.mock.calls.map(([line]) => line as string)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('Nuxt client plugin from ./analytics.mjs threw')
    expect(lines[1]).toContain('Nuxt client plugin from ./session.mjs threw')
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

  // `defineNuxtPlugin(() => {})`: no `_name`, and a `.name` of `''`, which `??`
  // took for a name. The warning then had a gap where the plugin goes (#1063).
  it('names an unnamed plugin by the file it came from', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    const plugin = Object.assign(async () => {
      throw new Error('needs the full Nuxt runtime')
    }, {})

    await __povesteTolerant(plugin, '/app/plugins/analytics.client.ts')({})

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Nuxt client plugin from /app/plugins/analytics.client.ts threw'), expect.any(Error))
  })

  it('says so when an unnamed plugin has no file either', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())

    await __povesteTolerant(Object.assign(async () => {
      throw new Error('boom')
    }, {}))({})

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Nuxt client plugin (anonymous) threw'), expect.any(Error))
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

describe('the HstNuxt teardown', () => {
  function callOnBuild() {
    const plugin = HstNuxt()
    const api = { onBuildEnd: vi.fn(), changeViteConfig: vi.fn(), onPreviewStory: vi.fn() }
    const cleanups: (() => unknown)[] = []

    plugin.onBuild!(api as never, cb => cleanups.push(cb))

    return { api, cleanups }
  }

  it('registers its teardown as cleanup, which runs however the build ends', () => {
    expect(callOnBuild().cleanups).toHaveLength(1)
  })

  it('does not register it as a build-end callback', () => {
    // `onBuildEnd` only runs when the build succeeded, so Nuxt was left running
    // after every build that failed — around a hundred watcher handles (#434).
    expect(callOnBuild().api.onBuildEnd).not.toHaveBeenCalled()
  })

  it('awaits the close rather than leaving it floating', async () => {
    // Not awaited, a successful build could finish before Nuxt had shut down.
    await expect(callOnBuild().cleanups[0]()).resolves.toBeUndefined()
  })
})

describe('wrapPluginTemplates', () => {
  const SOURCE = 'import a from \'a\'\nexport default [a]\n'

  // Nuxt regenerates templates on a story edit and hands the hook the same objects.
  it('wraps a template once however many times the hook runs', async () => {
    const template = { filename: 'plugins.client.mjs', getContents: () => SOURCE }

    wrapPluginTemplates([template])
    wrapPluginTemplates([template])
    const contents = await template.getContents()

    expect(contents.match(/import \{ __povesteTolerant \}/g)).toHaveLength(1)
    expect(contents.match(/\.map\(\(plugin, index\) => __povesteTolerant\(/g)).toHaveLength(1)
  })

  it('leaves other templates alone', async () => {
    const template = { filename: 'app-component.mjs', getContents: () => SOURCE }

    wrapPluginTemplates([template])

    expect(await template.getContents()).toBe(SOURCE)
  })
})

// `nuxt:module-preload-polyfill` looks for Nuxt's client entry, which a book
// does not have, so it raised `NUXT_B7005` and a "Could not resolve client
// entry" line at every start and build (#1203).
describe('withoutIgnoredPlugins', () => {
  it('drops the preload polyfill plugin, wherever Nuxt nests it', () => {
    const plugins = [{ name: 'vite:vue' }, [{ name: 'nuxt:module-preload-polyfill' }, { name: 'nuxt:kept' }], null]

    expect(withoutIgnoredPlugins(plugins)).toEqual([{ name: 'vite:vue' }, [{ name: 'nuxt:kept' }], null])
  })

  it('leaves a config with no plugin list alone', () => {
    expect(withoutIgnoredPlugins(undefined)).toBeUndefined()
  })
})
