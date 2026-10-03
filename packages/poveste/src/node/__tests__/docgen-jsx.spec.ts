import type { JsxDialect } from '../docgen/jsx/index.js'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'pathe'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createJsxExtractor } from '../docgen/jsx/index.js'

const root = join(import.meta.dirname, 'docgen-jsx')
const file = (name: string) => join(root, 'src', name)

// Solid's, written out here: the plugin owns the real one.
const solid: JsxDialect = {
  jsxImportSource: 'solid-js',
  componentTypes: ['Component', 'ParentComponent', 'VoidComponent', 'FlowComponent'],
  defaultCalls: ['mergeProps', 'mergeDefaultProps'],
  slotType: /\bJSX\.Element\b/,
}

function extractor(options: { allow?: string[] } = {}) {
  return createJsxExtractor({ root, options }, solid)
}

describe('the JSX extractor', () => {
  // One extractor across the read-only cases. Its program builds on the first read, so that read
  // happens here, under a timeout a slow CI runner fits in.
  const shared = extractor()
  beforeAll(() => shared.extract(file('Button.story.tsx')), 60_000)
  const button = () => shared.extract(file('Button.story.tsx'))!
  const prop = async (name: string) => (await button()).props.find(prop => prop.name === name)

  it('documents the component a story names in its `component` field', async () => {
    expect((await button()).name).toBe('Button')
  })

  it('reads props from the type of the component\'s first parameter', async () => {
    expect(await prop('label')).toEqual({ name: 'label', description: 'Shown when there is nothing to say.', type: 'string', required: true, tags: [] })
  })

  it('prints an optional prop\'s type without the `undefined` strict mode adds', async () => {
    expect((await prop('size'))!.type).toBe('"sm" | "md" | "lg"')
  })

  it('takes a default from `mergeProps` and agrees with a tag that says the same', async () => {
    expect(await prop('size')).toMatchObject({ default: '"md"', defaultTag: '"md"' })
    expect((await prop('size'))!.defaultConflict).toBeUndefined()
  })

  it('reads no default from an object merged after the props, which overrides rather than defaults', async () => {
    expect((await prop('label'))!.default).toBeUndefined()
  })

  it('flags a code default that disagrees with its tag, and shows the code\'s', async () => {
    expect(await prop('tone')).toMatchObject({ default: '"danger"', defaultTag: '\'neutral\'', defaultConflict: true })
  })

  it('reads an `on*` function as an event, with its parameters as the payload', async () => {
    expect((await button()).events).toEqual([
      { name: 'onPress', description: 'Called once the press lands.', type: 'count: number, source: "mouse" | "key"', tags: [] },
    ])
  })

  it('reads `children` and element-typed props as slots', async () => {
    expect((await button()).slots.map(slot => slot.name)).toEqual(['icon', 'children'])
  })

  it('leaves out what the component inherits from the JSX attribute types, and what is hidden', async () => {
    expect((await button()).props.map(prop => prop.name)).toEqual(['size', 'tone', 'label'])
  })

  it('reads defaults from a destructured parameter, through a story exported by name', async () => {
    const card = await shared.extract(file('Card.story.tsx'))

    expect(card).toMatchObject({ name: 'Card', props: [{ name: 'elevation', default: '1' }, { name: 'title' }] })
  })

  it('documents nothing for a story that names no component', async () => {
    expect(await shared.extract(file('Plain.story.tsx'))).toBeUndefined()
  })

  it('reports the story\'s sources, not the packages it reads', async () => {
    const sources = await shared.sources!()

    expect(sources).toContain(file('Button.tsx'))
    expect(sources.every(source => !source.includes('/node_modules/'))).toBe(true)
  })
})

describe('the JSX extractor, with a package allowed', () => {
  it('documents props a component inherits from that package', { timeout: 60_000 }, async () => {
    const doc = await extractor({ allow: ['solid-js'] }).extract(file('Button.story.tsx'))

    expect(doc!.props.map(prop => prop.name)).toContain('disabled')
  })
})

describe('the JSX extractor, after a change on disk', () => {
  const card = file('Card.tsx')
  const original = readFileSync(card, 'utf8')
  afterEach(() => writeFileSync(card, original))

  it('reads the component again once told the file changed', { timeout: 60_000 }, async () => {
    const jsx = extractor()
    await jsx.extract(file('Card.story.tsx'))

    writeFileSync(card, original.replace('elevation = 1', 'elevation = 3'))
    await jsx.update!(card)

    expect(await jsx.extract(file('Card.story.tsx'))).toMatchObject({ props: [{ name: 'elevation', default: '3' }, { name: 'title' }] })
  })
})
