import type { DocgenExtractor } from '@poveste/shared'
import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createExtractor } from '../extractor.js'

// Nuxt 4's layout: a root tsconfig of `files: []` and `references`, the app's settings in `.nuxt` (#1535).
const NUXT = fileURLToPath(new URL('../../../fixtures/docgen-nuxt', import.meta.url))

let extractor: DocgenExtractor
beforeAll(async () => {
  extractor = await createExtractor({ root: NUXT, options: {} })
})
afterAll(() => extractor.dispose())

describe('a book whose root tsconfig holds only references', () => {
  it('reads a component through the referenced project that includes it', async () => {
    const doc = await extractor.extract(join(NUXT, 'app/components/BaseButton.vue'))

    expect(doc!.props).toEqual([
      expect.objectContaining({ name: 'label', type: 'string | undefined', default: '"Click me"' }),
      expect.objectContaining({ name: 'disabled', type: 'boolean | undefined' }),
    ])
  }, 60_000)

  it('names the tsconfig it read when a component is in none of them', async () => {
    const outside = join(NUXT, 'layers/Outside.vue')

    await expect(async () => extractor.extract(outside)).rejects.toThrow(`'${outside}' is not in the program of ${join(NUXT, '.nuxt/tsconfig.app.json')}, the tsconfig auto-docs reads.`)
  }, 60_000)
})
