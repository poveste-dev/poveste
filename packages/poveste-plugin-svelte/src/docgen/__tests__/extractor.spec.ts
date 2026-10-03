import type { DocgenExtractor } from '@poveste/shared'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createExtractor } from '../extractor.js'

const FIXTURE = fileURLToPath(new URL('../../../fixtures/docgen', import.meta.url))
const file = (name: string) => join(FIXTURE, name)

// One language service for the read-only cases. Its program builds on the first
// read, so that read happens here, under a timeout a slow CI runner fits in.
let extractor: DocgenExtractor
beforeAll(async () => {
  extractor = await createExtractor({ root: FIXTURE, options: {} })
  await extractor.extract(file('Button.svelte'))
}, 60_000)
afterAll(() => extractor.dispose())

async function button() {
  const doc = (await extractor.extract(file('Button.svelte')))!
  return { ...doc, prop: (name: string) => doc.props.find(prop => prop.name === name) }
}

describe('svelte auto-docs through svelte2tsx', () => {
  it('resolves props from an imported interface and the one it extends', async () => {
    expect((await button()).props.map(prop => prop.name).sort()).toEqual(['label', 'level', 'pressed', 'size', 'variant'])
  })

  it('names the component after its file', async () => {
    expect((await button()).name).toBe('Button')
  })

  it('carries the description, the type and whether it is required', async () => {
    expect((await button()).prop('label')).toEqual({ name: 'label', description: 'The text on the button.', type: 'string', required: true, tags: [] })
  })

  it('takes the destructuring default, through `$bindable`, and agrees with a tag that says the same', async () => {
    const { prop } = await button()

    expect(prop('size')).toMatchObject({ default: '"md"', defaultTag: '"md"' })
    expect(prop('size')!.defaultConflict).toBeUndefined()
    expect(prop('pressed')).toMatchObject({ default: 'false' })
  })

  it('flags a code default its tag contradicts, and shows the code\'s', async () => {
    expect((await button()).prop('level')).toMatchObject({ default: '2', defaultTag: '3', defaultConflict: true })
  })

  it('reads a `Snippet` member as a slot and an `on*` function as an event', async () => {
    const doc = await button()

    expect(doc.slots.map(slot => slot.name)).toEqual(['icon', 'children'])
    expect(doc.events).toEqual([{ name: 'onpress', description: 'Called when the button is pressed.', type: 'event: MouseEvent', tags: [] }])
  })

  it('marks a deprecated prop, hides an internal one, and drops the HTML attributes it inherits', async () => {
    const { prop } = await button()

    expect(prop('variant')!.tags).toEqual([{ name: 'deprecated', text: 'use `tone`' }])
    expect(prop('secret')).toBeUndefined()
    expect(prop('disabled')).toBeUndefined()
  })

  it('reads a Svelte 4 component\'s `export let` props and defaults', async () => {
    const doc = await extractor.extract(file('Legacy.svelte'))

    expect(doc!.props).toMatchObject([
      { name: 'greeting', description: 'The greeting to show.', type: 'string', default: '"Hello"' },
      { name: 'count', type: 'number', default: '0' },
    ])
  })

  it('reads an untyped component from its destructuring', async () => {
    const doc = await extractor.extract(file('Untyped.svelte'))

    expect(doc!.props.map(prop => [prop.name, prop.default])).toEqual([['title', '"Untitled"'], ['count', undefined]])
  })

  it('reads a component that has a rune module of the same name beside it', async () => {
    const doc = await extractor.extract(file('Scope.svelte'))

    expect(doc!.props).toMatchObject([{ name: 'trapped', type: 'boolean', default: 'true' }])
  })

  it('follows a component the book\'s `paths` map, through a re-export', async () => {
    const doc = await extractor.extract(file('Card.svelte'))

    // Icon's own `Props`, resolved; an import TypeScript could not follow prints `any`.
    expect(doc!.props).toMatchObject([{ name: 'icon', type: 'Props' }])
  })

  it('reports what it read as the files on disk, without packages', async () => {
    const sources = await extractor.sources!()

    expect(sources).toEqual(expect.arrayContaining([file('Button.svelte'), file('types.ts'), file('base.ts')]))
    expect(sources.some(source => source.includes('/node_modules/') || source.endsWith('.svelte.tsx'))).toBe(false)
  })
})

describe('svelte auto-docs, after a change on disk', () => {
  const base = file('base.ts')
  const original = readFileSync(base, 'utf8')
  afterAll(() => writeFileSync(base, original))

  it('reads an imported type again once told it changed', { timeout: 60_000 }, async () => {
    const own = await createExtractor({ root: FIXTURE, options: {} })
    await own.extract(file('Button.svelte'))

    writeFileSync(base, original.replace('How prominent the button is.', 'How loud the button is.'))
    await own.update!(base)

    expect((await own.extract(file('Button.svelte')))!.props.find(prop => prop.name === 'level')!.description).toBe('How loud the button is.')
    await own.dispose()
  })
})

describe('svelte auto-docs, with a package allowed', () => {
  it('documents the attributes a component inherits from it', { timeout: 60_000 }, async () => {
    const own = await createExtractor({ root: FIXTURE, options: { allow: ['svelte'] } })

    const doc = await own.extract(file('Button.svelte'))

    expect(doc!.props.map(prop => prop.name)).toContain('disabled')
    await own.dispose()
  })
})
