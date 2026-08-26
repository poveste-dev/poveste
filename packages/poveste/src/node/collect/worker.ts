import type { ServerRunPayload, ServerStory, ServerStoryFile } from '@poveste/shared'
import type { MessagePort } from 'node:worker_threads'
import type { FetchFunction, ResolveIdFunction } from 'vite-node'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { parentPort } from 'node:worker_threads'
import { createBirpc } from 'birpc'
import { dirname, resolve } from 'pathe'
import pc from 'picocolors'
import { ModuleCacheMap, ViteNodeRunner } from 'vite-node/client'
import { createDomEnv, resetDomEnv } from '../dom/env.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface Payload {
  root: string
  base: string
  port: MessagePort
  storyFile: ServerStoryFile
  defineGlobals?: Record<string, unknown>
}

export interface ReturnData {
  storyData: ServerStory[]
}

const _moduleCache = new ModuleCacheMap()
let _runner: ViteNodeRunner
// Worker-lifetime: externalised runtimes cache the DOM they first saw, so one
// per story broke re-collection.
let _domEnv: ReturnType<typeof createDomEnv> | undefined
let _rpc: ReturnType<typeof createBirpc<{
  fetchModule: FetchFunction
  resolveId: ResolveIdFunction
}>>

// Cleanup module cache
parentPort.on('message', (message) => {
  if (message?.kind === 'hst:invalidate') {
    _moduleCache.delete(message.file)
  }
})

export default async (payload: Payload): Promise<ReturnData> => {
  const startTime = performance.now()
  process.env.HST_COLLECT = 'true'

  // Before any module runs: an externalised dep reads these at import time.
  for (const [key, value] of Object.entries(payload.defineGlobals ?? {})) {
    ;(globalThis as Record<string, unknown>)[key] = value
  }

  _rpc = createBirpc<{
    fetchModule: FetchFunction
    resolveId: ResolveIdFunction
  }>({}, {
    post: data => payload.port.postMessage(data),
    on: data => payload.port.on('message', data),
  })

  const runner = _runner ?? (_runner = new ViteNodeRunner({
    root: payload.root,
    base: payload.base,
    moduleCache: _moduleCache,
    fetchModule(id) {
      return _rpc.fetchModule(id)
    },
    resolveId(id, importer) {
      return _rpc.resolveId(id, importer)
    },
  }))

  if (_domEnv) {
    resetDomEnv(_domEnv)
  }
  else {
    _domEnv = createDomEnv()
  }

  const el = window.document.createElement('div')

  const beforeExecuteTime = performance.now()
  // Mount app to collect stories/variants
  const { run } = (await runner.executeFile(resolve(__dirname, './run.js'))) as { run: (payload: ServerRunPayload) => Promise<any> }
  const afterExecuteTime = performance.now()
  const storyData: ServerStory[] = []
  await run({
    file: payload.storyFile,
    storyData,
    el,
  })
  const afterRunTime = performance.now()

  if (payload.storyFile.markdownFile) {
    const el = document.createElement('div')
    el.innerHTML = payload.storyFile.markdownFile.html
    const text = el.textContent
    storyData.forEach((s) => {
      s.docsText = text
    })
  }

  const endTime = performance.now()
  console.log(pc.dim(`${payload.storyFile.relativePath} ${Math.round(endTime - startTime)}ms (setup:${Math.round(beforeExecuteTime - startTime)}ms, execute:${Math.round(afterExecuteTime - beforeExecuteTime)}ms, run:${Math.round(afterRunTime - afterExecuteTime)}ms)`))

  return {
    storyData,
  }
}
