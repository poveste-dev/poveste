import type { DocgenExtractor, DocgenExtractorModule } from '@poveste/shared'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { createDocgenEngine, importable } from '../docgen/engine.js'

const DOC = { props: [], slots: [], events: [] }

function fakeModule(overrides: Partial<DocgenExtractor> = {}) {
  const extractor = { extract: vi.fn(() => DOC), update: vi.fn(), dispose: vi.fn(), ...overrides }
  const module: DocgenExtractorModule = { createExtractor: vi.fn(() => extractor) }
  return { module, extractor }
}

function engine(module: DocgenExtractorModule, heapUsed = () => 0) {
  return createDocgenEngine({
    root: '/book',
    extractors: [{ name: 'vue', module: 'fake' }],
    heapLimit: 100,
    heapUsed,
    load: async () => module,
  })
}

describe('the docgen engine', () => {
  it('creates no extractor until a component is asked for', async () => {
    const { module } = fakeModule()
    const docgen = engine(module)

    await docgen.update('/book/src/types.ts')

    expect(module.createExtractor).not.toHaveBeenCalled()
  })

  it('creates one extractor and keeps it across requests', async () => {
    const { module } = fakeModule()
    const docgen = engine(module)

    await docgen.extract([{ name: 'vue', file: '/book/src/A.vue' }])
    await docgen.extract([{ name: 'vue', file: '/book/src/B.vue' }])

    expect(module.createExtractor).toHaveBeenCalledOnce()
  })

  it('answers a failed extraction with its error instead of rejecting', async () => {
    const { module } = fakeModule({ extract: () => {
      throw new Error('no props type')
    } })

    const results = await engine(module).extract([{ name: 'vue', file: '/book/src/A.vue' }])

    expect(results).toEqual({ '/book/src/A.vue': { error: 'no props type' } })
  })

  // storybookjs/storybook#35260: laziness alone did not cap memory.
  it('disposes its extractors past the heap ceiling and builds afresh after', async () => {
    const { module, extractor } = fakeModule()
    let used = 80
    const docgen = engine(module, () => used)

    await docgen.extract([{ name: 'vue', file: '/book/src/A.vue' }])
    used = 10
    await docgen.extract([{ name: 'vue', file: '/book/src/B.vue' }])

    expect(extractor.dispose).toHaveBeenCalledOnce()
    expect(docgen.stats).toEqual({ created: 2, recycled: 1 })
  })

  it('reports what its extractors read, and nothing before one exists', async () => {
    const { module } = fakeModule({ sources: () => ['/book/src/A.vue', '/elsewhere/types.ts'] })
    const docgen = engine(module)

    expect(await docgen.sources()).toEqual([])
    await docgen.extract([{ name: 'vue', file: '/book/src/A.vue' }])

    expect(await docgen.sources()).toEqual(['/book/src/A.vue', '/elsewhere/types.ts'])
  })

  it('stays below the ceiling without recycling', async () => {
    const { module, extractor } = fakeModule()
    const docgen = engine(module, () => 69)

    await docgen.extract([{ name: 'vue', file: '/book/src/A.vue' }])

    expect(extractor.dispose).not.toHaveBeenCalled()
  })
})

describe('the module a plugin names', () => {
  it('is imported as a file URL when given as a path', () => {
    // Absolute on whichever platform runs it: `D:\book\...` on Windows, where the bug was.
    const path = resolve('/book/node_modules/plugin/extractor.js')

    const url = importable(path)

    expect(url).toMatch(/^file:\/\/\//)
    expect(fileURLToPath(url)).toBe(path)
  })

  it('is imported as given when already a URL or a package', () => {
    expect(importable('file:///book/extractor.js')).toBe('file:///book/extractor.js')
    expect(importable('@poveste/plugin-vue/docgen')).toBe('@poveste/plugin-vue/docgen')
  })
})
