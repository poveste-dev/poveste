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
// headless story sandbox can't provide, so they 500 the iframe on entry boot;
// @nuxtjs/i18n's are dropped by default (#65), and `excludePlugins` drops more
// without patching this package (#277).
const DEFAULT_EXCLUDED_PLUGINS: (string | RegExp)[] = [/[\\/]@nuxtjs[\\/]i18n[\\/].*[\\/]plugins[\\/]/]

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
        nuxt?.close()
      })
    },

    onBuild(api) {
      api.onBuildEnd(() => {
        nuxt?.close()
      })
    },

    onPreview() {
      nuxt?.close()
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
  )

  // Drop the sandbox-incompatible client plugins named by `excludePlugins`, so
  // they don't 500 the story iframe on entry boot. See DEFAULT_EXCLUDED_PLUGINS.
  nuxt.hook('app:resolve', (app) => {
    app.plugins = app.plugins.filter((p) => {
      const src = p.src ?? ''
      return !excludePlugins.some(pattern =>
        typeof pattern === 'string' ? src.includes(pattern) : pattern.test(src))
    })
  })

  nuxt.hook('app:templates', (app) => {
    app.templates = app.templates.filter(template => template.filename !== 'app-component.mjs')
    app.templates.push({ src: join(runtimeDir, 'app-component.mjs'), filename: 'app-component.mjs' })
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
