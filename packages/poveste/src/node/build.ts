import type { Awaitable, BuildEndCallback, ChangeViteConfigCallback, PreviewStoryCallback } from '@poveste/shared'
import type {
  Rolldown,
  InlineConfig as ViteInlineConfig,
  Plugin as VitePlugin,
} from 'vite'
import type { Context } from './context.js'
import { performance } from 'node:perf_hooks'
import fs from 'fs-extra'
import { lookup as lookupMime } from 'mrmime'
import { join } from 'pathe'
import pc from 'picocolors'
import {
  createServer as createViteServer,
  mergeConfig as mergeViteConfig,
  build as viteBuild,
} from 'vite'
import { APP_PATH } from './alias.js'
import { getSerializedStoryData } from './build-serialize.js'
import { useCollectStories } from './collect/index.js'
import { useModuleLoader } from './load.js'
import { createMarkdownFilesWatcher } from './markdown.js'
import { BuildPluginApi } from './plugin.js'
import { startPreview } from './preview.js'
import { findAllStories } from './stories.js'
import {
  chromeCssScopePlugin,
  entryCssMergerPlugin,
  userCssScopePlugin,
} from './style-isolation/index.js'
import { applyHeadTransform } from './util/head.js'
import { wrapLogError } from './util/log.js'
import { viteMode } from './util/vite-mode.js'
import { getViteConfigWithPlugins } from './vite.js'

const PRELOAD_MODULES = [
  'vendor',
]

// Kept out of the shared `vendor` chunk because only the app UI imports them,
// while `vendor` is imported by the sandbox too.
//
// Shiki is the source panel's syntax highlighter: 386 grammars and 60 themes,
// and it was the bulk of an 11.5 MB `vendor`. The sandbox entry pulls seven Vue
// exports from that chunk and nothing else, but a grid renders one sandbox
// iframe per cell and each iframe is its own realm — so every cell parsed and
// executed all 11.5 MB again, with the HTTP cache saving only the download.
// That was 34% of a scroll profile spent in top-level vendor evaluation (#103).
//
// They go to a chunk of their own rather than being left to Rollup: leaving
// placement automatic emitted one chunk per grammar — 402 assets — and tripled
// the blocking time it was meant to cut.
const APP_ONLY_VENDORS = [
  /[\\/]node_modules[\\/]shiki[\\/]/,
  /[\\/]node_modules[\\/]@shikijs[\\/]/,
]

const PREFETCHED_MODULES = [
  'StoryView',
  'reactivity',
  'global-components',
]

export async function build(ctx: Context) {
  const startTime = performance.now()
  await findAllStories(ctx)

  // Scan for markdown files
  {
    const { stop } = await createMarkdownFilesWatcher(ctx)
    await stop()
  }

  const { viteConfig } = await getViteConfigWithPlugins(true, ctx)
  const server = await createViteServer(
    mergeViteConfig(viteConfig, {
      // Collection reads `import.meta.env` too, so it takes the same mode as
      // the build below. `createServer` otherwise defaults to `development`,
      // which would put one `.env` file in `poveste.json` and the other in the
      // bundle built from it.
      mode: viteMode(ctx.mode),
      optimizeDeps: { include: [], noDiscovery: true },
    }),
  )
  await server.pluginContainer.buildStart({})

  // Cleanup a plugin registers runs however this ends. `onBuildEnd` cannot be that
  // channel: "the build ended" and "the build ended well" are different events, and
  // plugins publish results from the latter (#434).
  const cleanupCallbacks: (() => Awaitable<void>)[] = []
  const onCleanup = (cb: () => Awaitable<void>) => {
    cleanupCallbacks.push(cb)
  }

  // Everything from here is wrapped so the server is closed on the way out
  // whichever way that is — it is the other handle that kept a failed build
  // alive (#405). `serverClosed` keeps the existing order rather than moving the
  // buildEnd callbacks either side of the close.
  let serverClosed = false
  try {
    const moduleLoader = useModuleLoader({
      server,
      throws: true,
    })
    const changeViteConfigCallbacks: ChangeViteConfigCallback[] = []
    const buildEndCallbacks: BuildEndCallback[] = []
    const previewStoryCallbacks: PreviewStoryCallback[] = []
    for (const plugin of ctx.config.plugins) {
      if (plugin.onBuild) {
        const api = new BuildPluginApi(ctx, plugin, moduleLoader)
        await plugin.onBuild(api, onCleanup)
        changeViteConfigCallbacks.push(...api.changeViteConfigCallbacks)
        buildEndCallbacks.push(...api.buildEndCallbacks)
        previewStoryCallbacks.push(...api.previewStoryCallbacks)
      }
    }

    // Collect story data
    const { executeStoryFile, destroy: destroyCollectStories } = useCollectStories({
      server,
      throws: true,
    }, ctx)
    // `throws: true`, so one bad story rejects here. Without the `finally` the
    // teardown below never ran, eleven worker threads stayed alive, and the process
    // hung instead of failing — the error was printed and then nothing (#405).
    try {
      await Promise.all(ctx.storyFiles.map(storyFile => executeStoryFile(storyFile)))
    }
    finally {
      // Logged, not thrown: a teardown that rejects would replace the error that
      // caused the teardown, which is the failure this whole change is about.
      // Same wrapper the dev path uses for these exact calls (server.ts).
      await wrapLogError('destroyCollectStories', () => destroyCollectStories())
    }

    const storyCount = ctx.storyFiles.reduce((sum, file) => sum + (file.story?.variants.length ? 1 : 0), 0)
    const variantCount = ctx.storyFiles.reduce((sum, file) => sum + (file.story?.variants.length ?? 0), 0)
    const emptyStoryCount = ctx.storyFiles.length - storyCount

    const { viteConfig: buildViteConfigRaw } = await getViteConfigWithPlugins(false, ctx)
    const buildViteConfig: ViteInlineConfig = mergeViteConfig(buildViteConfigRaw, {
      // Vite picks the `.env` file from `mode`, not from NODE_ENV — this said
      // `'development'` from histoire until #349.
      mode: viteMode(ctx.mode),
      build: {
        lib: false,
        rollupOptions: {
          // Named, not an array. With an array the bundler derives `[name]` from the
          // path, and `APP_PATH` is absolute — so any framework whose `entryFileNames`
          // refuses a path-shaped `[name]` fails the build outright (#369, and
          // histoire-dev/histoire#802 before it). The keys make `[name]` the key.
          input: {
            'bundle-main': join(APP_PATH, 'bundle-main.js'),
            'bundle-sandbox': join(APP_PATH, 'bundle-sandbox.js'),
          },
          plugins: [
            {
              name: 'poveste-build-rollup-options-override',
              enforce: 'post',
              options(options) {
                // Don't externalize
                options.external = []
              },
            },
          ],
        },
      },
    })

    // For @vite/plugin-vue: Always put our vite server
    // Disable template inlining
    // (so that we no longer need defineExpose)
    // Nuxt: replaces the Nuxt vite dev server
    buildViteConfig.plugins.push({
      name: 'poveste-vue-plugin-override',
      config(config) {
        const vuePlugin = config.plugins.find((p: any) => p.name === 'vite:vue') as VitePlugin
        if (vuePlugin) {
          // @ts-expect-error vue plugin use function form
          const original = vuePlugin.configureServer.bind(vuePlugin)
          vuePlugin.configureServer = () => {
            original({
              ...server,
              config: {
                ...server.config,
                server: {
                  ...server.config.server,
                  hmr: false,
                },
              },
            })
          }
          // @ts-expect-error vue plugin use function form
          vuePlugin.configureServer(server)
        }
      },
    })

    buildViteConfig.plugins.push({
      name: 'poveste-build-config-override',
      enforce: 'post',
      config(config) {
        // Don't externalize
        config.build.rollupOptions.external = []

        // Force chunk strategy
        config.build.rollupOptions.output = {
          manualChunks(id) {
            // Vite's runtime helpers (`\0vite/preload-helper.js` and friends) are
            // virtual modules, so the node_modules routing below never sees them
            // and their placement is left to the bundler — which parked
            // `__vitePreload` inside the 10 MB `highlighter` chunk. Every chunk
            // importing the helper then statically imported the whole highlighter,
            // and the sandbox was back to evaluating it once per grid cell (#197),
            // undoing exactly what `APP_ONLY_VENDORS` is for. Pin them somewhere
            // harmless instead of leaving the choice to chunking heuristics.
            if (id.replace(/^\0/, '').startsWith('vite/')) {
              return 'app-runtime'
            }

            if (!id.includes('@poveste/app') && id.includes('node_modules')) {
              if (APP_ONLY_VENDORS.some(test => test.test(id))) {
                return 'highlighter'
              }

              for (const test of ctx.config.build?.excludeFromVendorsChunk ?? []) {
                if ((
                  typeof test === 'string' && id.includes(test)
                ) || (
                  test instanceof RegExp && test.test(id)
                )) {
                  // Excluded from vendor chunk
                  return
                }
              }
              return 'vendor'
            }
          },
        }

        // A framework that declares Vite environments gives each one its own
        // `build.outDir`, and that wins over the top-level value for the environment's
        // output — so the book was written to the framework's directory (Vike: `dist/client`)
        // while poveste kept looking in `outDir` (#369). Only the client environment
        // builds the book. Where no framework declared environments there is nothing to
        // override, and where one did this puts the book back where poveste reads it.
        if (config.environments?.client?.build) {
          config.environments.client.build.outDir = ctx.config.outDir
        }

        // Force vite build options
        Object.assign(config.build, {
          outDir: ctx.config.outDir,
          emptyOutDir: true,
          // Re-merged per-entry by entry-css-merger.
          cssCodeSplit: true,
          minify: false,
          // Don't build in SSR mode
          ssr: false,
        })

        config.define.__HST_COLLECT__ = false
      },
    })

    const isolate = ctx.config.isolateStyles !== false
    buildViteConfig.plugins.push(userCssScopePlugin({ enabled: isolate }))
    buildViteConfig.plugins.push(chromeCssScopePlugin({ enabled: isolate }))
    buildViteConfig.plugins.push(entryCssMergerPlugin({ isolateStyles: isolate }))

    for (const cb of changeViteConfigCallbacks) {
      console.log('vite config hook', cb)
      await cb(buildViteConfig)
    }

    const results = await viteBuild(buildViteConfig)
    const result = Array.isArray(results) ? results[0] : results as Rolldown.RolldownOutput

    function findEntryCss(entryName: string) {
      return result.output.find(
        o => o.type === 'asset' && o.fileName === `${entryName}.css`,
      )
    }
    const mainStyleOutput = findEntryCss('bundle-main')
      ?? result.output.find(o => o.name === 'style.css' && o.type === 'asset')
    const sandboxStyleOutput = findEntryCss('bundle-sandbox') ?? mainStyleOutput

    // Preload
    const preloadOutputs = result.output.filter(o => PRELOAD_MODULES.includes(o.name) && o.type === 'chunk')
    const preloadHtml = generateScriptLinks(preloadOutputs.map(o => o.fileName), 'preload', ctx)

    // Prefetch
    const prefetchOutputs = result.output.filter(o => PREFETCHED_MODULES.includes(o.name) && o.type === 'chunk')
    const prefetchHtml = generateScriptLinks(prefetchOutputs.map(o => o.fileName), 'prefetch', ctx)

    // Index
    const indexOutput = result.output.find(o => o.name === 'bundle-main' && o.type === 'chunk')
    let indexHtml = generateEntryHtml(indexOutput.fileName, mainStyleOutput.fileName, {
      HEAD: `${preloadHtml}${prefetchHtml}`,
    }, ctx)
    indexHtml = await applyHeadTransform(indexHtml, ctx.config.head)
    await writeFile('index.html', indexHtml, ctx)

    // Sandbox
    const sandboxOutput = result.output.find(o => o.name === 'bundle-sandbox' && o.type === 'chunk')
    let sandboxHtml = generateEntryHtml(sandboxOutput.fileName, sandboxStyleOutput.fileName, {}, ctx)
    sandboxHtml = await applyHeadTransform(sandboxHtml, ctx.config.head)
    await writeFile('__sandbox.html', sandboxHtml, ctx)

    await writeFile('poveste.json', JSON.stringify(getSerializedStoryData(ctx), null, 2), ctx)

    const duration = performance.now() - startTime
    if (emptyStoryCount) {
      console.warn(pc.yellow(`⚠️  ${emptyStoryCount} empty story file${emptyStoryCount === 1 ? '' : 's'}`))
    }
    console.log(pc.green(`✅ Built ${storyCount} stor${storyCount === 1 ? 'y' : 'ies'} (${variantCount} variant${variantCount === 1 ? '' : 's'}) in ${Math.round(duration / 1000 * 100) / 100}s`))

    // Render
    if (previewStoryCallbacks.length) {
      const { baseUrl, close } = await startPreview({}, ctx)
      try {
        for (const storyFile of ctx.storyFiles) {
          const story = storyFile.story
          for (const variant of story.variants) {
            const query = new URLSearchParams()
            query.append('storyId', story.id)
            query.append('variantId', variant.id)
            const url = `${baseUrl}__sandbox.html?${query.toString()}`
            for (const fn of previewStoryCallbacks) {
              await fn({
                file: storyFile.path,
                story,
                variant,
                url,
              })
            }
          }
        }
      }
      finally {
        // A screenshot or percy callback that throws would otherwise leave this
        // server bound — the same leak as the two above, one level down.
        await wrapLogError('startPreview.close', () => close())
      }
    }

    await server.close()
    serverClosed = true

    for (const fn of buildEndCallbacks) {
      await fn()
    }
  }
  finally {
    if (!serverClosed) {
      await wrapLogError('server.close', () => server.close())
    }
    for (const cb of cleanupCallbacks) {
      await wrapLogError('plugin.onBuild.onCleanup', () => cb())
    }
  }
}

function generateBaseHtml(head: string, body: string, ctx: Context) {
  return `<!DOCTYPE html>
<html lang="${ctx.config.theme.lang ?? 'en'}">
<head>
  <title>${ctx.config.theme.title}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>html,body{margin:0;padding:0}</style>
  ${head}
</head>
<body>
  ${body}
</body>
</html>`
}

function generateEntryHtml(jsEntryFile: string, cssEntryFile: string, variables: { HEAD?: string }, ctx: Context) {
  return generateBaseHtml(
    `<link rel="stylesheet" href="${ctx.resolvedViteConfig.base}${cssEntryFile}">
    ${ctx.config.theme?.favicon ? `<link rel="icon" type="${lookupMime(ctx.config.theme.favicon)}" href="${ctx.resolvedViteConfig.base}${ctx.config.theme.favicon}"/>` : ''}
    ${variables.HEAD ?? ''}`,
    `<div id="app"></div>
    <script type="module" src="${ctx.resolvedViteConfig.base}${jsEntryFile}"></script>`,
    ctx,
  )
}

async function writeFile(fileName: string, content: string, ctx: Context) {
  await fs.writeFile(join(ctx.config.outDir, fileName), content, 'utf8')
}

function generateScriptLinks(prefetchScripts: string[], rel: string, ctx: Context) {
  return prefetchScripts.map(s => `<link rel="${rel}" href="${ctx.resolvedViteConfig.base}${s}" as="script" crossOrigin="anonymous">`).join('')
}
