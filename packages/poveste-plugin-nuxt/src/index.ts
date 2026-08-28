import type { Nuxt } from '@nuxt/schema'
import type { Plugin } from 'poveste'
import type { UserConfig as ViteConfig } from 'vite'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import replace from '@rollup/plugin-replace'

const ignorePlugins = [
  'nuxt:vite-node-server',
  'nuxt:dev-style-ssr',
  'nuxt:vite-relative-asset',
  'nuxt:cache-dir',
  'nuxt:dynamic-base-path',
  'nuxt:import-protection',
]

export interface HstNuxtOptions {
  /**
   * Client plugins to drop from the story sandbox, matched against each
   * plugin's resolved `src` (string `includes` or `RegExp`). Added on top of
   * the built-in defaults, not replacing them.
   */
  excludePlugins?: (string | RegExp)[]
}

// Some Nuxt modules register client plugins that assume a full Nuxt runtime the
// headless story sandbox can't provide. The general net is `wrapPluginsForTolerantBoot`
// below, which skips one that throws rather than 500-ing the iframe; this list drops
// known offenders before they run at all — @nuxtjs/i18n by default (#65), plus whatever
// `excludePlugins` adds (#277), which is also the only lever for a plugin that throws at
// import, before the tolerant wrapper can catch it.
const DEFAULT_EXCLUDED_PLUGINS: (string | RegExp)[] = [/[\\/]@nuxtjs[\\/]i18n[\\/].*[\\/]plugins[\\/]/]

// Whether a resolved plugin `src` matches any exclusion pattern. `match`, not
// `test`: it doesn't advance a caller's /g regex `lastIndex`, so matching stays
// stateless without mutating an input we don't own.
export function isPluginExcluded(src: string, patterns: (string | RegExp)[]): boolean {
  return patterns.some(pattern =>
    typeof pattern === 'string' ? src.includes(pattern) : src.match(pattern) !== null)
}

// Wrap Nuxt's generated client-plugin list so each plugin boots tolerantly
// (#277): map the exported array through `__povesteTolerant`. Reuses Nuxt's own
// ordering by transforming its output rather than reimplementing it. Returns the
// source untouched if the `export default [...]` shape is not found, so an
// upstream format change degrades to today's behaviour instead of breaking.
export function wrapPluginsForTolerantBoot(source: string): string {
  const wrapped = source.replace(/export default (\[[\s\S]*?\])/, 'export default $1.map(__povesteTolerant)')
  if (wrapped === source) {
    return source
  }
  return `import { __povesteTolerant } from '#build/poveste/tolerant-plugins.mjs'\n${wrapped}`
}

export function HstNuxt(options: HstNuxtOptions = {}): Plugin {
  let nuxt: Nuxt
  return {
    name: '@poveste/plugin-nuxt',

    async defaultConfig() {
      const nuxtViteConfig = await useNuxtViteConfig([...DEFAULT_EXCLUDED_PLUGINS, ...(options.excludePlugins ?? [])])
      const { viteConfig } = nuxtViteConfig

      nuxt = nuxtViteConfig.nuxt // We save it to close it later
      const plugins = viteConfig.plugins.filter((p: any) => !ignorePlugins.includes(p?.name))
      return {
        vite: {
          server: {
            watch: viteConfig.server.watch,
            fs: {
              allow: viteConfig.server.fs.allow,
            },
            middlewareMode: false,
          },
          define: {
            ...viteConfig.define,
            'process.server': false,
            'process.client': true,
            'process.browser': true,
            'process.nitro': false,
            'process.prerender': false,
          },
          resolve: {
            alias: viteConfig.resolve.alias,
            extensions: viteConfig.resolve.extensions,
            dedupe: viteConfig.resolve.dedupe,
          },
          plugins: [
            ...plugins,
            replace({
              values: {
                'import.meta.server': 'false',
                'import.meta.client': 'true',
              },
              preventAssignment: true,
            }),
          ],
          css: viteConfig.css,
          publicDir: viteConfig.publicDir,
          optimizeDeps: {
            ...viteConfig.optimizeDeps,
            exclude: [
              ...viteConfig.optimizeDeps.exclude,
              '@poveste/plugin-nuxt',
            ],
          },
          // @ts-expect-error Vue-specific config
          vue: viteConfig.vue,
          logLevel: 'info',
        },
        setupCode: [
          `${nuxt.options.css.map(file => `import '${file}'`).join('\n')}`,
          `import { setupNuxtApp } from '@poveste/plugin-nuxt/dist/runtime/app-setup.js'
export async function setupVue3 () {
  await setupNuxtApp(${JSON.stringify(nuxt.options.runtimeConfig.public)})
}`,
        ],
        viteNodeInlineDeps: [
          /\/(nuxt|nuxt3)\//,
          /^#/,
          /\.nuxt/,
          ...(nuxt.options.build.transpile.filter(
            r => typeof r === 'string' || r instanceof RegExp,
          ) as Array<string | RegExp>),
        ],
        build: {
          excludeFromVendorsChunk: [
            /nuxt\/dist\/app/,
          ],
        },
      }
    },

    onDev(api, onCleanup) {
      onCleanup(async () => {
        await nuxt?.close()
      })
    },

    onBuild(api, onCleanup) {
      // Not `onBuildEnd`: that only runs when the build succeeded, so anything
      // this instance holds outlived every build that failed (#434).
      onCleanup(async () => {
        await nuxt?.close()
      })
    },

    async onPreview() {
      await nuxt?.close()
    },
  }
}

async function useNuxtViteConfig(excludePlugins: (string | RegExp)[]) {
  const { loadNuxt, buildNuxt } = await import('@nuxt/kit')
  const nuxt = await loadNuxt({
    // cwd: process.cwd(),
    ready: false,
    dev: true,
    overrides: {
      // Keep the auxiliary instance out of the host's `.nuxt`: it regenerates
      // `imports.d.ts` and friends, which any later type-aware lint or vue-tsc
      // run would then read instead of the application's own (#223).
      buildDir: '.nuxt/poveste',
      devtools: { enabled: false },
      ssr: false,
      experimental: {
        appManifest: false,
      },
      app: {
        rootId: 'nuxt-test',
      },
      pages: false,
      typescript: {
        typeCheck: false,
      },
    },
  })
  if (nuxt.options.builder as string !== '@nuxt/vite-builder') {
    throw new Error(`Poveste only supports Vite bundler, but Nuxt builder is currently set to '${nuxt.options.builder}'.`)
  }
  const runtimeDir = fileURLToPath(new URL('../runtime', import.meta.url))
  nuxt.options.build.templates.push(
    { src: join(runtimeDir, 'composables.mjs'), filename: 'poveste/composables.mjs' },
    { src: join(runtimeDir, 'components.mjs'), filename: 'poveste/components.mjs' },
    { src: join(runtimeDir, 'tolerant-plugins.mjs'), filename: 'poveste/tolerant-plugins.mjs' },
  )

  // Drop the sandbox-incompatible client plugins named by `excludePlugins`, so
  // they don't 500 the story iframe on entry boot. See DEFAULT_EXCLUDED_PLUGINS.
  nuxt.hook('app:resolve', (app) => {
    app.plugins = app.plugins.filter(p => !isPluginExcluded(p.src ?? '', excludePlugins))
  })

  nuxt.hook('app:templates', (app) => {
    app.templates = app.templates.filter(template => template.filename !== 'app-component.mjs')
    app.templates.push({ src: join(runtimeDir, 'app-component.mjs'), filename: 'app-component.mjs' })

    // Tolerant boot (#277): wrap each generated client plugin so one that throws
    // while setting up in the sandbox is logged and skipped, not fatal to the
    // whole iframe. `excludePlugins` drops what we know can't run; this catches
    // the rest.
    for (const template of app.templates) {
      if (template.filename !== 'plugins.client.mjs' && template.filename !== 'plugins.server.mjs') {
        continue
      }
      const original = template.getContents
      if (!original) {
        continue
      }
      template.getContents = async (ctx: any) => wrapPluginsForTolerantBoot(await original(ctx))
    }
  })

  nuxt.hook('imports:sources', (presets) => {
    const polyfills = ['requestIdleCallback', 'cancelIdleCallback']
    const stubbedComposables = ['useNuxtApp']
    for (const appPreset of presets.filter(p => p && typeof p === 'object' && 'from' in p && p.from?.startsWith('#app'))) {
      if ('imports' in appPreset && Array.isArray(appPreset.imports)) {
        appPreset.imports = appPreset.imports.filter(i => typeof i !== 'string' || (!stubbedComposables.includes(i) && !polyfills.includes(i)))
      }
    }
    presets.push({
      from: '#build/poveste/composables.mjs',
      imports: stubbedComposables,
    })
  })

  return {
    viteConfig: await new Promise<ViteConfig>((resolve, reject) => {
      nuxt.hook('modules:done', () => {
        nuxt.hook('components:extend', (components) => {
          for (const name of ['NuxtLink']) {
            Object.assign(components.find(c => c.pascalName === name) || {}, {
              export: name,
              filePath: '#build/poveste/components.mjs',
            })
          }
        })

        nuxt.hook('vite:configResolved', (config, { isClient }) => {
          if (isClient) {
            resolve(config as any)
            // The resolved config is all this instance is for. Left running,
            // `buildNuxt` goes on to build the Nuxt client, start Nitro and
            // open Nuxt's own dev server — seconds of work on every `poveste
            // dev` and `poveste build`, a `NUXT_B7005` warning for the entry
            // it does not have, and an HMR socket on 24678 that collides with
            // any other Nuxt dev server on the machine (#220, #221). The catch
            // below has always known this sentinel; nothing threw it.
            throw new Error('_stop_')
          }
        })
      })
      nuxt.ready()
        .then(() => buildNuxt(nuxt))
        .catch((err) => {
          if (!err.toString().includes('_stop_')) {
            reject(err)
          }
        })
    }),
    nuxt,
  }
}
