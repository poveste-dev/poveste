import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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

// #1464: a book on TypeScript 7, whose `require('typescript')` gives only its version,
// is read with Poveste's TypeScript 6. A copy of the fixture, because Node caches
// where a directory's `typescript` resolved, and the cases above resolved it first.
describe('a book on TypeScript 7', () => {
  const book = join(dirname(root), `docgen-ts7-${process.pid}`)

  beforeAll(() => {
    cpSync(root, book, { recursive: true })
    const typescript = join(book, 'node_modules', 'typescript')
    mkdirSync(typescript, { recursive: true })
    writeFileSync(join(typescript, 'package.json'), JSON.stringify({ name: 'typescript', version: '7.0.2', main: 'index.js' }))
    writeFileSync(join(typescript, 'index.js'), 'module.exports = { version: \'7.0.2\', versionMajorMinor: \'7.0\' }\n')
  })
  afterAll(() => rmSync(book, { recursive: true, force: true }))

  it('is read with Poveste\'s TypeScript 6', async () => {
    const extractor = await createExtractor({ root: book, options: {} })

    const doc = await extractor.extract(join(book, 'src', 'Button.story.tsx'))

    expect(doc!.props.map(prop => prop.name)).toContain('label')
    await extractor.dispose?.()
  }, 60_000)
})
