import type { ServerStoryFile } from '@poveste/shared'
import type { ViteDevServer } from 'vite'
import type { FetchFunction, ResolveIdFunction } from 'vite-node'
import type { Context } from '../context.js'
import type { Payload, ReturnData } from './worker.js'
import { cpus } from 'node:os'
import { MessageChannel } from 'node:worker_threads'
import Tinypool from '@akryum/tinypool'
import { escapeRegExp } from '@poveste/shared'
import { createBirpc } from 'birpc'
import path, { relative } from 'pathe'
import pc from 'picocolors'
import { ViteNodeServer } from 'vite-node/server'
import { TEMP_PATH } from '../alias.js'
import { createPath } from '../tree.js'
import { slash } from '../util/fs.js'
import { globalsFromDefine } from './define-globals.js'

export interface UseCollectStoriesOptions {
  server: ViteDevServer
  mainServer?: ViteDevServer
  throws?: boolean
}

export function useCollectStories(options: UseCollectStoriesOptions, ctx: Context) {
  const { server, mainServer } = options

  const node = new ViteNodeServer(server as any, {
    deps: {
      inline: [
        // Published layout: `poveste` and scoped `@poveste/*` packages. These
        // MUST be inlined so vite-node transforms them and resolves their
        // `virtual:` imports; otherwise they're loaded via native Node ESM,
        // which throws ERR_UNSUPPORTED_ESM_URL_SCHEME on `virtual:` and breaks
        // story collection for any fresh npm install.
        /\/poveste\/dist/,
        /\/poveste\/client/,
        /@poveste\/[\w-]+\/dist/,
        // Workspace layout: packages/poveste-<name>/dist (dev / monorepo).
        /poveste-[\w-]+\/dist/,
        /@vue\/devtools-api/,
        /vuetify/,
        // @TODO temporary fix for https://github.com/histoire-dev/histoire/issues/409
        /vite\w*\/dist\/client\/(client|env).mjs/,
        ...ctx.config.viteNodeInlineDeps ?? [],
        new RegExp(escapeRegExp(path.resolve(TEMP_PATH, 'plugins'))),
      ],
      fallbackCJS: true,
    },
    transformMode: ctx.config.viteNodeTransformMode,
  })

  // Same values a real build substitutes, so externalised deps see their flags.
  const defineGlobals = globalsFromDefine(server.config.define)

  const maxThreads = ctx.config.collectMaxThreads ?? cpus().length

  const threadsCount = ctx.mode === 'dev'
    ? Math.max(Math.min(maxThreads, Math.floor(cpus().length / 2)), 1)
    : Math.max(Math.min(maxThreads, cpus().length - 1), 1)
  console.log(pc.blue(`Using ${threadsCount} thread${threadsCount === 1 ? '' : 's'} for story collection`))

  const threadPool = new Tinypool({
    filename: new URL('./worker.js', import.meta.url).href,
    // WebContainer compatibility (Stackblitz)
    useAtomics: typeof process.versions.webcontainer !== 'string',
    minThreads: threadsCount,
    maxThreads: threadsCount,
  })

  function clearCache() {
    server.moduleGraph.invalidateAll()
    node.fetchCache.clear()
  }

  function createChannel() {
    const channel = new MessageChannel()
    const port = channel.port2
    const workerPort = channel.port1

    createBirpc<Record<string, never>, {
      fetchModule: FetchFunction
      resolveId: ResolveIdFunction
    }>({
      fetchModule: id => node.fetchModule(id),
      resolveId: (id, importer) => node.resolveId(id, importer),
    }, {
      post: data => port.postMessage(data),
      on: data => port.on('message', data),
    })

    return {
      port,
      workerPort,
    }
  }

  if (mainServer) {
    mainServer.watcher.on('change', (file) => {
      file = slash(file)
      threadPool.broadcastMessage({
        kind: 'hst:invalidate',
        file,
      })
    })
  }

  async function executeStoryFile(storyFile: ServerStoryFile) {
    // The channel belongs to this execution, and nothing used to close it. On a
    // build that fails, the executions still in flight are abandoned mid-run and
    // their main-thread ports stay open and listening — enough live handles to
    // keep the process alive with nothing left to do (#426).
    let channel: ReturnType<typeof createChannel> | undefined
    try {
      channel = createChannel()
      const payload: Payload = {
        root: server.config.root,
        base: server.config.base,
        storyFile,
        port: channel.workerPort,
        defineGlobals,
      }
      const { storyData } = await threadPool.run(payload, {
        transferList: [
          channel.workerPort,
        ],
      }) as ReturnData
      if (storyData.length === 0) {
        console.warn(pc.yellow(`⚠️  No story found for ${storyFile.path}`))
        return
      }
      else if (storyData.length > 1) {
        console.warn(pc.yellow(`⚠️  Multiple stories not supported: ${storyFile.path}`))
      }

      const finalData = storyData[0]

      // Default props
      if (ctx.config.defaultStoryProps) {
        for (const key in ctx.config.defaultStoryProps) {
          finalData[key] ??= ctx.config.defaultStoryProps[key]
        }
      }

      if (!finalData.layout) {
        finalData.layout = { type: 'single', iframe: true }
      }

      storyFile.id = finalData.id
      storyFile.story = finalData
      storyFile.treeFile = {
        title: finalData.title,
        path: relative(server.config.root, storyFile.path),
      }
      storyFile.treePath = createPath(ctx.config, storyFile.treeFile)
      storyFile.story.title = storyFile.treePath[storyFile.treePath.length - 1]
    }
    catch (e) {
      console.error(pc.red(`Error while collecting story ${storyFile.path}:\n${e.frame ? `${pc.bold(e.message)}\n${e.frame}` : e.stack}`))
      if (options.throws) {
        throw e
      }
    }
    finally {
      channel?.port.close()
    }
  }

  async function destroy() {
    await threadPool.destroy()
  }

  return {
    clearCache,
    executeStoryFile,
    destroy,
  }
}
