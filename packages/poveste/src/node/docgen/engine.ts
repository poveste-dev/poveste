import type { ComponentDoc, DocgenExtractor, DocgenExtractorModule } from '@poveste/shared'
import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { getHeapStatistics } from 'node:v8'

export interface EngineExtractorSpec {
  /** The plugin's name, which keys its extractor. */
  name: string
  module: string
  options?: unknown
}

export type ExtractResult = { doc: ComponentDoc } | { doc?: undefined, error: string }

export interface DocgenEngineOptions {
  root: string
  extractors: EngineExtractorSpec[]
  /**
   * Dispose every extractor once the heap passes this share of its limit, and
   * build afresh on the next request. Storybook recycles at 0.7, and laziness
   * alone did not cap its memory (storybookjs/storybook#35260).
   */
  heapRatio?: number
  heapLimit?: number
  heapUsed?: () => number
  load?: (module: string) => Promise<DocgenExtractorModule>
}

/** The extraction loop that runs inside the docgen worker, kept free of the thread. */
/** `import()` takes a URL, and an absolute Windows path is not one: `D:` reads as its scheme. */
export function importable(module: string) {
  return isAbsolute(module) ? pathToFileURL(module).href : module
}

export function createDocgenEngine(options: DocgenEngineOptions) {
  const heapRatio = options.heapRatio ?? 0.7
  const heapLimit = options.heapLimit ?? getHeapStatistics().heap_size_limit
  const heapUsed = options.heapUsed ?? (() => process.memoryUsage().heapUsed)
  const load = options.load ?? (module => import(importable(module)) as Promise<DocgenExtractorModule>)

  const live = new Map<string, Promise<DocgenExtractor>>()
  const stats = { created: 0, recycled: 0 }

  function extractorFor(name: string): Promise<DocgenExtractor> {
    let extractor = live.get(name)
    if (!extractor) {
      const spec = options.extractors.find(e => e.name === name)
      if (!spec) {
        throw new Error(`no docgen extractor named "${name}"`)
      }
      extractor = load(spec.module).then((module) => {
        stats.created++
        return module.createExtractor({ root: options.root, options: spec.options })
      })
      // A failed start is not cached: the next request tries again.
      extractor.catch(() => live.delete(name))
      live.set(name, extractor)
    }
    return extractor
  }

  async function disposeAll() {
    const extractors = [...live.values()]
    live.clear()
    await Promise.all(extractors.map(async extractor => (await extractor.catch(() => undefined))?.dispose()))
  }

  async function recycleIfNeeded() {
    if (live.size > 0 && heapUsed() > heapLimit * heapRatio) {
      await disposeAll()
      stats.recycled++
    }
  }

  return {
    stats,

    async extract(requests: { name: string, file: string }[]): Promise<Record<string, ExtractResult>> {
      const results: Record<string, ExtractResult> = {}
      for (const { name, file } of requests) {
        try {
          const extractor = await extractorFor(name)
          const doc = await extractor.extract(file)
          results[file] = doc ? { doc } : { error: 'no component found' }
        }
        catch (error) {
          results[file] = { error: error instanceof Error ? error.message : String(error) }
        }
        await recycleIfNeeded()
      }
      return results
    },

    async update(file: string) {
      for (const extractor of live.values()) {
        await (await extractor.catch(() => undefined))?.update?.(file)
      }
    },

    dispose: disposeAll,
  }
}
