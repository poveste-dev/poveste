import type { Plugin } from '@poveste/shared'
import type { DocgenRunner } from '../docgen/service.js'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createDocgenService } from '../docgen/service.js'

const vue: Plugin = { name: 'vue', docgen: { match: file => file.endsWith('.vue') && !file.endsWith('.story.vue'), module: 'fake' } }
// A JSX story names its component in a field, so the extractor is handed the story itself.
function jsx(name: string): Plugin {
  return {
    name,
    supportPlugin: { id: name, moduleName: `@poveste/plugin-${name}`, setupFn: [], importStoryComponent: () => '' },
    docgen: { scope: 'story', match: file => /\.story\.[jt]sx$/.test(file), module: 'fake' },
  }
}
const solid = jsx('solid')

function fakeRunner() {
  const sent: { type: string, requests?: { name: string, file: string }[] }[] = []
  const runner: DocgenRunner = {
    send: vi.fn(async (request) => {
      sent.push(request)
      if (request.type !== 'extract') return { id: 0 }
      return {
        id: 0,
        results: Object.fromEntries(request.requests.map(({ file }) => [file, { doc: { props: [], slots: [], events: [] } }])),
        sources: ['/book/src/Button.vue', '/packages/ui/src/types.ts'],
      }
    }),
    terminate: vi.fn(async () => {}),
  }
  return { runner, sent, createRunner: vi.fn(() => runner) }
}

function service(overrides: Partial<Parameters<typeof createDocgenService>[0]> = {}) {
  const fake = fakeRunner()
  const docgen = createDocgenService({
    root: '/book',
    plugins: [vue],
    enabled: true,
    collected: Promise.resolve(),
    componentsOf: () => ['/book/src/Button.vue', '/book/src/types.ts', '/book/src/Button.story.vue'],
    createRunner: fake.createRunner,
    ...overrides,
  })
  return { docgen, ...fake }
}

function extracted(sent: { type: string, requests?: { file: string }[] }[]) {
  return sent.filter(r => r.type === 'extract').flatMap(r => r.requests!.map(q => q.file))
}

describe('the docgen service', () => {
  // The acceptance line of #1159: a book whose readers never open the panel pays nothing.
  it('starts no worker before the first request, whatever changes on disk', async () => {
    const { docgen, createRunner } = service()

    expect(await docgen.fileChanged('/book/src/types.ts')).toBe(false)

    expect(createRunner).not.toHaveBeenCalled()
    expect(docgen.started).toBe(false)
  })

  it('starts one on the first request', async () => {
    const { docgen, createRunner } = service()

    await docgen.request('button')

    expect(createRunner).toHaveBeenCalledOnce()
  })

  it('waits for collection before extracting anything', async () => {
    let finish!: () => void
    const { docgen, createRunner } = service({ collected: new Promise<void>((resolve) => {
      finish = resolve
    }) })

    const pending = docgen.request('button')
    await Promise.resolve()
    expect(createRunner).not.toHaveBeenCalled()

    finish()
    await pending
    expect(createRunner).toHaveBeenCalledOnce()
  })

  it('extracts only the components the story imports that a plugin documents', async () => {
    const { docgen, sent } = service()

    const result = await docgen.request('button')

    expect(extracted(sent)).toEqual(['/book/src/Button.vue'])
    expect(Object.keys(result.components)).toEqual(['src/Button.vue'])
  })

  it('hands a story-scoped plugin the story file, not what the story imports', async () => {
    const { docgen, sent } = service({
      plugins: [solid],
      storyOf: () => ({ file: '/book/src/Button.story.tsx', supportPluginId: 'solid' }),
      componentsOf: () => ['/book/src/Button.tsx', '/book/src/Other.story.tsx'],
    })

    const result = await docgen.request('button')

    expect(sent[0]!.requests).toEqual([{ name: 'solid', file: '/book/src/Button.story.tsx' }])
    expect(Object.keys(result.components)).toEqual(['src/Button.story.tsx'])
  })

  it('hands a story to the plugin collection gave it, when two plugins match its file', async () => {
    const { docgen, sent } = service({
      plugins: [solid, jsx('react')],
      storyOf: () => ({ file: '/book/src/Button.story.tsx', supportPluginId: 'react' }),
      componentsOf: () => [],
    })

    await docgen.request('button')

    expect(sent[0]!.requests).toEqual([{ name: 'react', file: '/book/src/Button.story.tsx' }])
  })

  it('never hands an import-scoped plugin the story file, though it matches', async () => {
    const { docgen, sent } = service({
      plugins: [{ name: 'vue', docgen: { match: file => file.endsWith('.vue'), module: 'fake' } }],
      storyOf: () => ({ file: '/book/src/Button.story.vue', supportPluginId: 'vue' }),
      componentsOf: () => ['/book/src/Button.vue'],
    })

    await docgen.request('button')

    expect(extracted(sent)).toEqual(['/book/src/Button.vue'])
  })

  it('extracts a component once across requests', async () => {
    const { docgen, sent } = service()

    await Promise.all([docgen.request('button'), docgen.request('button')])
    await docgen.request('button')

    expect(extracted(sent)).toEqual(['/book/src/Button.vue'])
  })

  it('drops what it extracted when a file changes, and extracts it again on request', async () => {
    const { docgen, sent } = service()
    await docgen.request('button')

    expect(await docgen.fileChanged('/book/src/types.ts')).toBe(true)
    await docgen.request('button')

    expect(extracted(sent)).toEqual(['/book/src/Button.vue', '/book/src/Button.vue'])
  })

  // A types file outside the root, or one the browser never loads, is otherwise
  // never seen to change, and the docs went stale until a restart (#1190).
  it('hands the files the extractor read to the watcher, once each', async () => {
    const watch = vi.fn()
    const { docgen } = service({ watch })

    await docgen.request('button')
    await docgen.fileChanged('/packages/ui/src/types.ts')
    await docgen.request('button')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(watch).toHaveBeenCalledOnce()
    expect(watch).toHaveBeenCalledWith(['/book/src/Button.vue', '/packages/ui/src/types.ts'])
  })

  it('leaves out a component the book excludes', async () => {
    const { docgen, sent } = service({ bookOptions: { exclude: ['src/Button'] } })

    await docgen.request('button')

    expect(extracted(sent)).toEqual([])
  })

  it('leaves out a file its extractor found nothing to document in', async () => {
    const { docgen } = service({
      plugins: [solid],
      storyOf: () => ({ file: '/book/src/Plain.story.tsx', supportPluginId: 'solid' }),
      createRunner: () => ({ send: async () => ({ id: 0, results: { '/book/src/Plain.story.tsx': {} } }), terminate: async () => {} }),
    })

    expect((await docgen.request('plain')).components).toEqual({})
  })

  it('never starts when the config turns it off', async () => {
    const { docgen, createRunner } = service({ enabled: false })

    expect(await docgen.request('button')).toEqual({ storyId: 'button', components: {} })
    expect(createRunner).not.toHaveBeenCalled()
  })

  // A Vue book without a TypeScript vue-component-meta can read showed an error
  // under every component (#1382). One line in the log says so instead.
  it('leaves out a plugin that says it cannot document the book, and says why once', async () => {
    const warn = vi.fn()
    const { docgen, createRunner } = service({
      plugins: [{ ...vue, docgen: { ...vue.docgen!, unavailable: () => 'Auto-docs is off: no TypeScript.' } }],
      warn,
    })

    // The Docs tab says why, in the log's words (#1400).
    expect(await docgen.request('button')).toEqual({ storyId: 'button', components: {}, off: 'Auto-docs is off: no TypeScript.' })
    await docgen.request('button')

    expect(createRunner).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledExactlyOnceWith('[poveste] Auto-docs is off: no TypeScript.')
  })

  // A plugin whose entry also runs in the browser can't import the check, so it
  // declares where its extractor loads TypeScript from, and the service asks (#1401).
  it('leaves out a plugin whose extractor would load a TypeScript newer than 6 from the book', async () => {
    const root = mkdtempSync(join(tmpdir(), 'poveste-ts7-book-'))
    try {
      mkdirSync(join(root, 'node_modules', 'typescript'), { recursive: true })
      writeFileSync(join(root, 'node_modules', 'typescript', 'package.json'), JSON.stringify({ name: 'typescript', version: '7.0.2' }))
      const warn = vi.fn()
      const { docgen, createRunner } = service({
        root,
        plugins: [{ ...solid, docgen: { ...solid.docgen!, typescript: 'book' } }],
        componentsOf: () => [join(root, 'src/Button.story.tsx')],
        warn,
      })

      expect(await docgen.request('button')).toEqual({ storyId: 'button', components: {} })

      expect(createRunner).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/^\[poveste\] Auto-docs is off: .*has TypeScript 7\.0\.2/))
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('names TypeScript, not the plugin\'s own reason, in a book that has neither', async () => {
    const root = mkdtempSync(join(tmpdir(), 'poveste-no-ts-book-'))
    try {
      mkdirSync(join(root, 'node_modules', 'typescript'), { recursive: true })
      writeFileSync(join(root, 'node_modules', 'typescript', 'package.json'), JSON.stringify({ name: 'typescript', version: '7.0.2' }))
      const warn = vi.fn()
      const unavailable = vi.fn(() => 'Auto-docs is off: no svelte2tsx.')
      service({ root, plugins: [{ ...vue, docgen: { ...vue.docgen!, typescript: 'book', unavailable } }], warn })

      expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/has TypeScript 7\.0\.2/))
      expect(unavailable).not.toHaveBeenCalled()
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  // #1432: a story importing components through what auto-docs cannot follow got no table and no word why.
  it('says why a story whose imported components reached no file has no table', async () => {
    const { docgen } = service({ componentsOf: () => ({ files: [], unresolved: 2 }) })

    const { components, off } = await docgen.request('button')

    expect(components).toEqual({})
    expect(off).toMatch(/^No table: auto-docs found no component file behind the 2 components this story imports\..*`component` on its `<Story>`/)
  })

  it('says nothing more for a story whose components reached a file', async () => {
    const { docgen } = service({ componentsOf: () => ({ files: ['/book/src/Button.vue'], unresolved: 1 }) })

    expect((await docgen.request('button')).off).toBeUndefined()
  })

  it('leaves out a plugin whose declared type package the book lacks, naming it once', async () => {
    const root = mkdtempSync(join(tmpdir(), 'poveste-untyped-book-'))
    try {
      const warn = vi.fn()
      const { docgen, createRunner } = service({
        root,
        plugins: [{ ...solid, docgen: { ...solid.docgen!, types: ['@types/react'] } }],
        componentsOf: () => [join(root, 'src/Button.story.tsx')],
        warn,
      })

      expect(await docgen.request('button')).toEqual({ storyId: 'button', components: {} })

      expect(createRunner).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/^\[poveste\] Auto-docs is off: .*from `@types\/react`, which this book does not have/))
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  // `autoDocs: false` on a story is about that story only: a component another story
  // imports is still read for it (#1398).
  it('extracts nothing for a story that turns its table off, and still does for another', async () => {
    const { docgen, sent, createRunner } = service({
      storyOf: storyId => ({ file: `/book/src/${storyId}.story.vue`, supportPluginId: 'vue3', autoDocs: storyId === 'wrapper' ? false : undefined }),
    })

    expect(await docgen.request('wrapper')).toEqual({ storyId: 'wrapper', components: {} })
    expect(createRunner).not.toHaveBeenCalled()

    expect(Object.keys((await docgen.request('button')).components)).toEqual(['src/Button.vue'])
    expect(extracted(sent)).toEqual(['/book/src/Button.vue'])
  })

  it('gives no reason for a story another plugin documents', async () => {
    const svelte: Plugin = { name: 'svelte', docgen: { match: file => file.endsWith('.svelte'), module: 'fake', unavailable: () => 'Auto-docs is off: no TypeScript.' } }
    // A Vue story importing no component: nothing to show, and Svelte's reason is not its reason.
    const { docgen } = service({ plugins: [vue, svelte], warn: () => {}, componentsOf: () => ['/book/src/types.ts'] })

    const result = await docgen.request('helpers')

    expect(result).toEqual({ storyId: 'helpers', components: {} })
  })

  it('does not ask whether a plugin can document the book when the config turns it off', () => {
    const unavailable = vi.fn(() => 'no TypeScript')
    service({ enabled: false, plugins: [{ ...vue, docgen: { ...vue.docgen!, unavailable } }] })

    expect(unavailable).not.toHaveBeenCalled()
  })

  it('never starts without a plugin that documents components', async () => {
    const { docgen, createRunner } = service({ plugins: [{ name: 'vanilla' }] })

    await docgen.request('button')

    expect(createRunner).not.toHaveBeenCalled()
  })
})

// The extractor reads a JSX story's `component` and nothing else, so a story without
// one held a type checker, about 250 MB in a Solid book, for no table (#1510).
describe('a JSX story and its `component` field', () => {
  function story(source: string) {
    const root = mkdtempSync(join(tmpdir(), 'poveste-jsx-story-'))
    const file = join(root, 'Badge.story.tsx')
    writeFileSync(file, source)
    return { root, file, remove: () => rmSync(root, { recursive: true, force: true }) }
  }

  it.each([
    ['in `defineStory`', `import { defineStory } from '@poveste/plugin-solid'\nexport default defineStory({ title: 'Badge', variants: [] })\n`],
    ['in a plain object', `export default { title: 'Badge', variants: [] }\n`],
    ['through a binding', `const story = defineStory({ title: 'Badge', variants: [] }) satisfies object\nexport default story\n`],
  ])('starts no extractor for a story that names none %s, and says to name one', async (_, source) => {
    const { file, remove } = story(source)
    const { docgen, createRunner } = service({ plugins: [solid], storyOf: () => ({ file, supportPluginId: 'solid' }), componentsOf: () => [] })

    try {
      const result = await docgen.request('badge')

      expect(createRunner).not.toHaveBeenCalled()
      expect(result.off).toMatch(/names no component\. Name the component it documents in its `component` field/)
    }
    finally {
      remove()
    }
  })

  it.each([
    ['by key', `export default defineStory({ title: 'Badge', component: Badge, variants: [] })\n`],
    ['in shorthand', `export default defineStory({ title: 'Badge', component, variants: [] })\n`],
    ['possibly, through a spread', `export default defineStory({ ...shared, title: 'Badge' })\n`],
  ])('hands the extractor a story that names one %s', async (_, source) => {
    const { file, remove } = story(source)
    const { docgen, sent } = service({ plugins: [solid], storyOf: () => ({ file, supportPluginId: 'solid' }), componentsOf: () => [] })

    try {
      await docgen.request('badge')

      expect(extracted(sent)).toEqual([file])
    }
    finally {
      remove()
    }
  })
})
