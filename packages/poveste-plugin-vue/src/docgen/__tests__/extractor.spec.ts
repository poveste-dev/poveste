import type { DocgenExtractor } from '@poveste/shared'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { beforeAll, describe, expect, it } from 'vitest'
import { createExtractor } from '../extractor.js'

const FIXTURE = fileURLToPath(new URL('../../../fixtures/docgen', import.meta.url))
const BUTTON = join(FIXTURE, 'Button.vue')

// One real checker for the file: building it is the slow part, and every case reads it.
// The checker builds its program on the first read, so that read happens here, under this timeout.
let extractor: DocgenExtractor
beforeAll(async () => {
  extractor = await createExtractor({ root: FIXTURE, options: {} })
  await extractor.extract(BUTTON)
}, 60_000)

async function button() {
  const doc = (await extractor.extract(BUTTON))!
  return { ...doc, prop: (name: string) => doc.props.find(prop => prop.name === name) }
}

describe('vue auto-docs through vue-component-meta', () => {
  it('resolves props from an imported interface and the one it extends', async () => {
    const { props } = await button()

    expect(props.map(prop => prop.name).sort()).toEqual(['label', 'level', 'size', 'variant'])
  })

  it('carries the description and the type', async () => {
    const { prop } = await button()

    expect(prop('label')).toMatchObject({ description: 'The text on the button.', type: 'string', required: true })
  })

  it('takes the default from the code, and the tag beside it', async () => {
    const { prop } = await button()

    expect(prop('size')).toMatchObject({ default: '"md"', defaultTag: '\'md\'' })
    expect(prop('size')?.defaultConflict).toBeUndefined()
  })

  // The code's default is the one that runs; a tag saying otherwise is flagged, not believed.
  it('flags a default the tag contradicts', async () => {
    const { prop } = await button()

    expect(prop('level')).toMatchObject({ default: '2', defaultTag: '3', defaultConflict: true })
  })

  it('keeps @deprecated', async () => {
    const { prop } = await button()

    expect(prop('variant')?.tags).toContainEqual({ name: 'deprecated', text: 'use `tone`' })
  })

  it('hides @internal', async () => {
    const { prop } = await button()

    expect(prop('secret')).toBeUndefined()
  })

  it('drops an attribute inherited from an installed package', async () => {
    const { prop } = await button()

    expect(prop('disabled')).toBeUndefined()
  })

  it('reads a slot with its description', async () => {
    const { slots } = await button()

    expect(slots).toEqual([expect.objectContaining({ name: 'icon', description: 'Shown before the label.' })])
  })

  // vue-component-meta 3.3.12 gives no event a description, in any `defineEmits` form.
  it('reads an event with its payload type', async () => {
    const { events } = await button()

    expect(events).toEqual([expect.objectContaining({ name: 'press', type: '[event: MouseEvent]' })])
  })

  it('reports the files its program read, for the dev server to watch', async () => {
    await button()

    const sources = await extractor.sources!()

    expect(sources).toContain(join(FIXTURE, 'base.ts'))
    expect(sources.some(file => file.includes('/node_modules/'))).toBe(false)
  })

  it('sees an edit to a file the component imports', async () => {
    const base = join(FIXTURE, 'base.ts')
    const original = readFileSync(base, 'utf8')
    try {
      writeFileSync(base, original.replace('  /** @internal */', '  /** Added by the spec. */\n  added?: boolean\n  /** @internal */'))
      await extractor.update!(base)

      expect((await button()).prop('added')).toMatchObject({ description: 'Added by the spec.' })
    }
    finally {
      writeFileSync(base, original)
      await extractor.update!(base)
    }
  })
})

// Last, and with its own checker: while a second checker lives in the process, the
// first stops seeing `updateFile`. The engine keeps one per framework and disposes
// before it builds again, so only the spec could hold two.
describe('a book that allows a base library', () => {
  it('keeps the props that library declares', async () => {
    await extractor.dispose()
    const allowing = await createExtractor({ root: FIXTURE, options: { allow: ['@vue/runtime-dom'] } })

    const doc = await allowing.extract(BUTTON)

    expect(doc!.props.map(prop => prop.name)).toContain('disabled')
    await allowing.dispose()
  }, 60_000)
})
