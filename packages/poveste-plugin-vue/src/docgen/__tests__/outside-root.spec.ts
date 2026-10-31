import type { DocgenExtractor } from '@poveste/shared'
import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createExtractor } from '../extractor.js'

// A book with no tsconfig whose stories reach components beside its root, as
// `@poveste/controls-stories` does with `storyMatch: ['../poveste-controls/src/**']` (#1559).
const FIXTURE = fileURLToPath(new URL('../../../fixtures/docgen-outside', import.meta.url))

let extractor: DocgenExtractor
beforeAll(async () => {
  extractor = await createExtractor({ root: join(FIXTURE, 'book'), options: {} })
})
afterAll(() => extractor.dispose())

describe('a book with no tsconfig', () => {
  it('reads a component outside its root, with the types it imports', async () => {
    const doc = await extractor.extract(join(FIXTURE, 'lib/Button.vue'))

    expect(doc!.props).toEqual([
      expect.objectContaining({ name: 'label', type: 'string', description: 'The text on the button.', required: true }),
      expect.objectContaining({ name: 'size', type: '"sm" | "md" | undefined' }),
    ])
  }, 60_000)

  it('reads a component a script file outside its root exports', async () => {
    const doc = await extractor.extract(join(FIXTURE, 'lib/Presence.ts'))

    expect(doc?.props).toEqual([expect.objectContaining({ name: 'present', required: true })])
  }, 60_000)

  it('reports a component outside its root among the files to watch', async () => {
    await extractor.extract(join(FIXTURE, 'lib/Button.vue'))

    expect(extractor.sources?.()).toEqual(expect.arrayContaining([join(FIXTURE, 'lib/Button.vue'), join(FIXTURE, 'lib/button-props.ts')]))
  }, 60_000)

  it('still reads a component inside its root', async () => {
    const doc = await extractor.extract(join(FIXTURE, 'book/Inside.vue'))

    expect(doc!.props).toEqual([expect.objectContaining({ name: 'label', type: 'string' })])
  }, 60_000)
})
