import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { createExtractor } from '../extractor'

const root = join(import.meta.dirname, '..', '..', '..', 'fixtures', 'docgen')
const story = (name: string) => join(root, 'src', `${name}.story.tsx`)

describe('the React extractor', () => {
  // One extractor across the cases. Its program builds on the first read, so that read happens
  // here, under a timeout a slow CI runner fits in.
  const extractor = createExtractor({ root, options: {} })
  beforeAll(() => extractor.extract(story('Button')), 60_000)
  const doc = async (name: string) => (await extractor.extract(story(name)))!
  const prop = async (name: string) => (await doc('Button')).props.find(prop => prop.name === name)

  it('documents the component a story names in its `component` field', async () => {
    expect((await doc('Button')).name).toBe('Button')
  })

  it('reads a prop from an imported interface, with its description', async () => {
    expect(await prop('label')).toEqual({ name: 'label', description: 'The field\'s label, read from an imported interface.', type: 'string', required: true, tags: [] })
  })

  it('takes a default from the destructured parameter, and flags one its tag contradicts', async () => {
    expect(await prop('size')).toMatchObject({ default: '"md"', defaultTag: '"md"' })
    expect(await prop('level')).toMatchObject({ default: '2', defaultTag: '3', defaultConflict: true })
  })

  it('marks a deprecated prop and hides an internal one', async () => {
    expect((await prop('variant'))!.tags).toEqual([{ name: 'deprecated', text: 'use `tone`' }])
    expect(await prop('secret')).toBeUndefined()
  })

  it('leaves out the attributes a component inherits from React', async () => {
    expect((await doc('Button')).props.map(prop => prop.name).sort()).toEqual(['label', 'level', 'size', 'variant'])
  })

  it('reads a `ReactNode` prop and `PropsWithChildren`\'s `children` as slots', async () => {
    expect((await doc('Button')).slots.map(slot => slot.name).sort()).toEqual(['children', 'hint', 'icon'])
  })

  it('reads an `on*` function as an event, with its parameters as the payload', async () => {
    expect((await doc('Button')).events).toEqual([
      { name: 'onPress', description: 'Called when the button is pressed.', type: 'event: React.MouseEvent<HTMLButtonElement, MouseEvent>', tags: [] },
    ])
  })

  it.for([
    ['Field', 'name', 'The input\'s name.'],
    ['Badge', 'count', 'How many.'],
    ['Legacy', 'text', 'Shown inside.'],
  ] as const)('reads %s\'s props through `forwardRef`, `memo` or a class', async ([name, prop, description]) => {
    expect((await doc(name)).props).toEqual([expect.objectContaining({ name: prop, description })])
  })

  it('reads `FC<P>`\'s props and a destructured default inside it', async () => {
    expect((await doc('Card')).props).toEqual([
      { name: 'title', description: 'The card\'s heading.', type: 'string', required: true, tags: [] },
      expect.objectContaining({ name: 'raised', default: 'false' }),
    ])
  })
})

// #1527: the hover a named type gets in the table, read by the shared prop reader every JSX
// and Svelte extractor uses.
describe('a named prop type, opened one level', () => {
  const extractor = createExtractor({ root, options: {} })
  const tone = async (name: string) => (await extractor.extract(story('Tone')))!.props.find(prop => prop.name === name)!

  it('opens an alias to its definition, in the order it is written', async () => {
    expect(await tone('size')).toMatchObject({ type: 'ButtonSize', resolved: '"sm" | "md" | "lg"' })
  }, 60_000)

  it('opens an interface to its members', async () => {
    expect((await tone('item')).resolved).toBe('{ id: string; label?: string }')
  })

  it('lists an enum by its members', async () => {
    expect((await tone('level')).resolved).toBe('Level.Low | Level.High')
  })

  it('opens a named member of a union in place', async () => {
    expect((await tone('fallback')).resolved).toBe('"sm" | "md" | "lg" | null')
  })

  it('leaves a type that names nothing, and one from a package, closed', async () => {
    const slots = (await extractor.extract(story('Tone')))!.slots
    expect([(await tone('label')).resolved, slots.find(slot => slot.name === 'icon')]).toEqual([undefined, expect.not.objectContaining({ resolved: expect.anything() })])
  })
})
