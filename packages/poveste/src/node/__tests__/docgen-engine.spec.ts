import type { DocgenExtractor, DocgenExtractorModule } from '@poveste/shared'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { createDocgenEngine, describeError, importable } from '../docgen/engine.js'

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

  it('answers with the component an extractor names in its failure', async () => {
    const { module } = fakeModule({ extract: () => {
      throw Object.assign(new Error('`Alert` has no props type to read'), { component: 'Alert' })
    } })

    const results = await engine(module).extract([{ name: 'vue', file: '/book/src/Alert.story.tsx' }])

    expect(results).toEqual({ '/book/src/Alert.story.tsx': { error: '`Alert` has no props type to read', name: 'Alert' } })
  })

  // A missing TypeScript reached the reader, and a built book, as Node's whole
  // MODULE_NOT_FOUND message: its require stack, with the machine's paths (#1382).
  it('answers with the error\'s first line, without the book\'s root or another absolute path', async () => {
    const { module } = fakeModule({ extract: () => {
      throw new Error('Cannot find module \'typescript\'\nRequire stack:\n- /book/node_modules/vue-component-meta/index.js')
    } })

    const results = await engine(module).extract([{ name: 'vue', file: '/book/src/A.vue' }])

    expect(results).toEqual({ '/book/src/A.vue': { error: 'Cannot find module \'typescript\'' } })
  })

  // storybookjs/storybook#35260: laziness alone did not cap memory.
  it('answers a file with nothing to document with an empty result, not an error', async () => {
    const { module } = fakeModule({ extract: vi.fn(() => undefined) })

    const results = await engine(module).extract([{ name: 'vue', file: '/book/src/Plain.story.tsx' }])

    expect(results).toEqual({ '/book/src/Plain.story.tsx': {} })
  })

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

describe('an extractor\'s error, as a reader sees it', () => {
  it('makes a path inside the book relative to it', () => {
    expect(describeError(new Error('Cannot read /book/src/A.vue'), '/book')).toBe('Cannot read src/A.vue')
  })

  it('cuts a path outside the book to its file name', () => {
    expect(describeError(new Error('ENOENT: no such file, open \'/Users/someone/project/tsconfig.json\''), '/book')).toBe('ENOENT: no such file, open \'tsconfig.json\'')
  })

  it('cuts a Windows path to its file name', () => {
    expect(describeError(new Error('Cannot find C:\\Users\\someone\\app\\tsconfig.json'), 'D:\\book')).toBe('Cannot find tsconfig.json')
  })

  it('leaves a message without a path as it is', () => {
    expect(describeError(new Error('ts.readJsonConfigFile is not a function'), '/book')).toBe('ts.readJsonConfigFile is not a function')
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
