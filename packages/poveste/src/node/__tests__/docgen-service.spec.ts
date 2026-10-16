import type { Plugin } from '@poveste/shared'
import type { DocgenRunner } from '../docgen/service.js'
import { describe, expect, it, vi } from 'vitest'
import { createDocgenService } from '../docgen/service.js'

const vue: Plugin = { name: 'vue', docgen: { match: file => file.endsWith('.vue') && !file.endsWith('.story.vue'), module: 'fake' } }

function fakeRunner() {
  const sent: { type: string, requests?: { file: string }[] }[] = []
  const runner: DocgenRunner = {
    send: vi.fn(async (request) => {
      sent.push(request)
      if (request.type !== 'extract') return { id: 0 }
      return { id: 0, results: Object.fromEntries(request.requests.map(({ file }) => [file, { doc: { props: [], slots: [], events: [] } }])) }
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

  it('leaves out a component the book excludes', async () => {
    const { docgen, sent } = service({ bookOptions: { exclude: ['src/Button'] } })

    await docgen.request('button')

    expect(extracted(sent)).toEqual([])
  })

  it('never starts when the config turns it off', async () => {
    const { docgen, createRunner } = service({ enabled: false })

    expect(await docgen.request('button')).toEqual({ storyId: 'button', components: {} })
    expect(createRunner).not.toHaveBeenCalled()
  })

  it('never starts without a plugin that documents components', async () => {
    const { docgen, createRunner } = service({ plugins: [{ name: 'vanilla' }] })

    await docgen.request('button')

    expect(createRunner).not.toHaveBeenCalled()
  })
})
