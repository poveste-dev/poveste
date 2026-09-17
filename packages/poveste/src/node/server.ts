import type { ServerStoryFile } from '@poveste/shared'
import type { Context } from './context.js'
import { performance } from 'node:perf_hooks'
import pc from 'picocolors'
import { createServer as createViteServer, mergeConfig as mergeViteConfig } from 'vite'
import { useCollectStories } from './collect/index.js'
import { hmrPortFor } from './commands/port.js'
import { useModuleLoader } from './load.js'
import { createMarkdownFilesWatcher, onMarkdownFileChange, onMarkdownListChange } from './markdown.js'
import { DevEventPluginApi, DevPluginApi } from './plugin.js'
import { onStoryChange, onStoryListChange, watchStories } from './stories.js'
import { wrapLogError } from './util/log.js'
import { createManagedWatches } from './util/managed-watches.js'
import * as VirtualFiles from './virtual/index.js'
import { getViteConfigWithPlugins } from './vite.js'

export interface CreateServerOptions {
  port?: number | undefined
  open?: boolean | undefined
  host?: string | boolean | undefined
}

type OnOpen = (name: string, close: () => unknown) => void

/**
 * Starts the dev server. Everything it opens is recorded as it opens and released
 * in reverse, by the returned `close` or by a start that fails before it could
 * return one, so what is closed cannot drift from what was opened (#867).
 */
export async function createServer(ctx: Context, options: CreateServerOptions = {}) {
  const opened: { name: string, close: () => unknown }[] = []
  async function release() {
    for (const { name, close } of opened.splice(0).reverse()) {
      await wrapLogError(name, () => close())
    }
  }

  try {
    return await startServer(ctx, options, (name, close) => opened.push({ name, close }), release)
  }
  catch (error) {
    await release()
    throw error
  }
}

async function startServer(ctx: Context, options: CreateServerOptions, onOpen: OnOpen, close: () => Promise<void>) {
  const getViteServer = async (collecting: boolean) => {
    const { viteConfig, viteConfigFile } = await getViteConfigWithPlugins(collecting, ctx)
    const serverConfig = viteConfig.server ??= {}

    if (collecting) {
      // The collection server drives a module runner and has no browser, so it needs
      // no HMR socket. Left enabled, `@nuxt/vite-builder` gives it one on the
      // framework default port (24678) — see the book server below.
      serverConfig.hmr = false
    }
    else {
      // `@nuxt/vite-builder` pins the HMR socket to the constant 24678 on every
      // server it configures, so two poveste dev servers on different `--port`s
      // collide on it and the second silently loses HMR (#221). It only does
      // this when `server.hmr` carries no port of its own (it fills the gap with
      // `defu`), so pin the socket to a port derived from this book's `--port`,
      // before the config is resolved: each dev server then owns a distinct one
      // (#175).
      serverConfig.hmr = { port: hmrPortFor(options.port ?? serverConfig.port) }

      if (options.open) {
        serverConfig.open = true
      }

      if (options.host) {
        serverConfig.host = options.host
      }

      // Same rule as `preview`: a port asked for by name is that port or
      // nothing. Floating to the next free one hands back a server nobody asked
      // for, and whoever opens the port they typed reads a different book.
      if (options.port != null) {
        serverConfig.strictPort = true
      }
    }

    const server = await createViteServer(
      mergeViteConfig(viteConfig, {
        optimizeDeps: { include: viteConfig.optimizeDeps?.include ?? [], noDiscovery: collecting },
      }),
    )
    await server.pluginContainer.buildStart({})
    return {
      server,
      viteConfigFile,
    }
  }

  // Should be run sequentially to get a fresh vite.config.js each time
  const { server: nodeServer } = await getViteServer(true) // Run before normal vite to prevent breaking HMR in Nuxt
  onOpen('nodeServer', () => nodeServer.close())
  const { server, viteConfigFile } = await getViteServer(false)
  onOpen('server.close', () => server.close())
  const storyWatcher = await watchStories(ctx)
  onOpen('storyWatcher', () => storyWatcher.close())
  const { stop: stopMdFileWatcher } = await createMarkdownFilesWatcher(ctx)
  onOpen('stopMdFileWatcher', () => stopMdFileWatcher())

  const moduleLoader = useModuleLoader({
    server: nodeServer,
  })

  // Not tied to the process cleanup, which runs as soon as `devCommand` returns,
  // while this server is still serving.
  const watches = createManagedWatches()
  onOpen('plugin watches', () => watches.close())

  for (const plugin of ctx.config.plugins) {
    if (plugin.onDev) {
      const api = new DevPluginApi(ctx, plugin, moduleLoader, watches)
      const onCleanup = (cb: () => void | Promise<void>) => {
        onOpen('plugin.onDev.onCleanup', cb)
      }
      await plugin.onDev(api, onCleanup)
    }
  }

  // Custom dev events
  server.ws.on(`poveste:dev-event`, async ({ event, payload }) => {
    for (const plugin of ctx.config.plugins) {
      if (plugin.onDevEvent) {
        const api = new DevEventPluginApi(ctx, plugin, moduleLoader, event, payload, watches)
        const result = await plugin.onDevEvent(api)
        if (!event.startsWith('on') && result !== undefined) {
          server.ws.send(`poveste:dev-event-result`, { event, result })
          break
        }
      }
    }
  })

  // Wait for pre-bundling (in `listen()`)
  await server.listen(options.port ?? server.config.server?.port)

  const {
    clearCache,
    executeStoryFile,
    destroy: destroyCollectStories,
  } = useCollectStories({
    server: nodeServer,
    mainServer: server,
  }, ctx)
  onOpen('destroyCollectStories', () => destroyCollectStories())

  // onStoryChange debouncing
  let queued = false
  let queuedFiles: ServerStoryFile[] = []
  let currentFiles: ServerStoryFile[] = []
  let queueTimer: ReturnType<typeof setTimeout> | undefined
  let collecting = false
  let didAllStoriesYet = false

  // Invalidate modules
  const invalidateModule = (id: string) => {
    const mod = server.moduleGraph.getModuleById(id)
    if (!mod) {
      return
    }
    server.moduleGraph.invalidateModule(mod)

    // Send HMR update
    const timestamp = Date.now()
    mod.lastHMRTimestamp = timestamp
    server.ws.send({
      type: 'update',
      updates: [
        {
          type: 'js-update',
          acceptedPath: mod.url,
          path: mod.url,
          timestamp,
        },
      ],
    })
  }

  onStoryChange(async (changedFile) => {
    if (changedFile && !didAllStoriesYet) {
      return
    }

    if (changedFile) {
      if (!queuedFiles.includes(changedFile)) {
        queuedFiles.push(changedFile)
      }
    }
    else {
      queuedFiles = []
    }

    if (!queued) {
      queued = true
      if (!collecting) {
        clearTimeout(queueTimer)
        // Debounce
        queueTimer = setTimeout(collect, 100)
      }
      else if (!changedFile && !currentFiles.length) {
        // Full collect in progress
        queued = false
      }
    }
  })

  async function collect() {
    collecting = true

    clearCache()

    currentFiles = queuedFiles.slice()
    queuedFiles = []
    queued = false

    const time = performance.now()
    if (currentFiles.length) {
      await Promise.all(currentFiles.map(async (storyFile) => {
        await executeStoryFile(storyFile)
        if (storyFile.story) {
          await invalidateModule(`/__resolved__virtual:story-source:${storyFile.story.id}`)
        }
      }))
    }
    else {
      // Full update

      // Progress tracking
      const fileCount = ctx.storyFiles.length
      let loadedFilesCount = 0
      const sendProgress = () => {
        server.ws.send('poveste:stories-loading-progress', {
          loadedFileCount: loadedFilesCount,
          totalFileCount: fileCount,
        })
      }

      sendProgress()

      await Promise.all(ctx.storyFiles.map(async (storyFile) => {
        await executeStoryFile(storyFile)
        loadedFilesCount++
        sendProgress()
      }))

      didAllStoriesYet = true
      server.ws.send('poveste:all-stories-loaded', {})
    }
    console.log(`Collect stories end ${pc.bold(pc.blue(Math.round(performance.now() - time)))}ms`)

    invalidateModule(VirtualFiles.RESOLVED_STORIES_ID)
    invalidateModule(VirtualFiles.RESOLVED_SEARCH_TITLE_DATA_ID)

    collecting = false

    if (queued) {
      await collect()
    }
  }

  onStoryListChange(() => {
    invalidateModule(VirtualFiles.RESOLVED_STORIES_ID)
    invalidateModule(VirtualFiles.RESOLVED_SEARCH_TITLE_DATA_ID)
  })

  onMarkdownListChange(() => {
    invalidateModule(VirtualFiles.RESOLVED_MARKDOWN_FILES)
  })

  // The list module is unchanged when a file is merely edited — the stale one is
  // that file's own module, which is what carries the rendered html (#370).
  onMarkdownFileChange((file) => {
    invalidateModule(`/__resolved__virtual:md:${file.id}`)
  })

  collect()

  return {
    server,
    viteConfigFile,
    close,
  }
}
