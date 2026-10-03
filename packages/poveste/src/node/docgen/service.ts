import type { Plugin } from '@poveste/shared'
import type { EngineExtractorSpec, ExtractResult } from './engine.js'
import type { DocgenRequest, DocgenResponse, StoryDocsResult } from './protocol.js'
import { Worker } from 'node:worker_threads'
import { relative } from 'pathe'

type Outgoing = DocgenRequest extends infer R ? R extends { id: number } ? Omit<R, 'id'> : never : never

export interface DocgenRunner {
  send: (request: Outgoing) => Promise<DocgenResponse>
  terminate: () => Promise<void>
}

export interface DocgenWorkerData {
  root: string
  extractors: EngineExtractorSpec[]
}

export function createWorkerRunner(data: DocgenWorkerData): DocgenRunner {
  const worker = new Worker(new URL('./worker.js', import.meta.url), { workerData: data })
  const pending = new Map<number, (response: DocgenResponse) => void>()
  let nextId = 0
  worker.on('message', (response: DocgenResponse) => {
    pending.get(response.id)?.(response)
    pending.delete(response.id)
  })
  // The engine already answers a failed extraction; this is the thread dying.
  worker.on('error', (error) => {
    for (const resolve of pending.values()) {
      resolve({ id: -1, results: {} })
    }
    pending.clear()
    console.error('[poveste] the docgen worker stopped:', error)
  })
  return {
    send: request => new Promise((resolve) => {
      const id = nextId++
      pending.set(id, resolve)
      worker.postMessage({ ...request, id })
    }),
    terminate: async () => {
      await worker.terminate()
    },
  }
}

export interface DocgenServiceOptions {
  root: string
  plugins: Plugin[]
  /** The config's off-switch. */
  enabled: boolean
  /** Settles once the first full collection has finished. */
  collected: Promise<void>
  /** The component files a story imports, resolved to absolute paths. */
  componentsOf: (storyId: string) => string[] | Promise<string[]>
  createRunner?: (data: DocgenWorkerData) => DocgenRunner
}

/**
 * When extraction runs, for every framework (#159). Nothing starts until a reader
 * first asks for a story's docs: no worker, no checker. Then only the components
 * that story imports are extracted, after collection has finished, and a change
 * on disk drops what was extracted rather than re-extracting it unasked.
 */
export function createDocgenService(options: DocgenServiceOptions) {
  const plugins = options.plugins.filter(plugin => plugin.docgen)
  const enabled = options.enabled && plugins.length > 0
  const createRunner = options.createRunner ?? createWorkerRunner

  let runner: DocgenRunner | undefined
  const cache = new Map<string, Promise<ExtractResult>>()

  function pluginFor(file: string) {
    return plugins.find(plugin => plugin.docgen!.match(file))
  }

  function start() {
    runner ??= createRunner({
      root: options.root,
      extractors: plugins.map(plugin => ({ name: plugin.name, module: plugin.docgen!.module, options: plugin.docgen!.options })),
    })
    return runner
  }

  function extract(files: string[]) {
    const missing = files.filter(file => !cache.has(file))
    if (missing.length) {
      const response = start().send({
        type: 'extract',
        requests: missing.map(file => ({ name: pluginFor(file)!.name, file })),
      })
      for (const file of missing) {
        cache.set(file, response.then(({ results }) => results?.[file] ?? { error: 'the docgen worker gave no answer' }))
      }
    }
    return Promise.all(files.map(async file => [relative(options.root, file), await cache.get(file)!] as const))
  }

  return {
    enabled,

    /** Whether a worker exists, and so whether a checker could. */
    get started() {
      return runner !== undefined
    },

    async request(storyId: string): Promise<StoryDocsResult> {
      if (!enabled) {
        return { storyId, components: {} }
      }
      await options.collected
      const files = (await options.componentsOf(storyId)).filter(file => pluginFor(file))
      return { storyId, components: Object.fromEntries(await extract(files)) }
    },

    /**
     * A file changed. Returns whether anything extracted went stale, so the
     * caller can tell an open panel to ask again. Before the first request there
     * is nothing to drop and nothing is started.
     */
    async fileChanged(file: string): Promise<boolean> {
      if (!runner || cache.size === 0 || file.includes('/node_modules/')) {
        return false
      }
      await runner.send({ type: 'update', file })
      cache.clear()
      return true
    },

    async dispose() {
      const current = runner
      runner = undefined
      cache.clear()
      if (current) {
        await current.send({ type: 'dispose' })
        await current.terminate()
      }
    },
  }
}
