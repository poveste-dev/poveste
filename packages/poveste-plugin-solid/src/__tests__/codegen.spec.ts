// @vitest-environment jsdom
import type { Variant } from '@poveste/shared'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { generateSourceCode } from '../client/codegen'
import { compileJsxCopy } from '../jsx-copy'

const dir = mkdtempSync(join(tmpdir(), 'poveste-solid-copy-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

const COMPONENTS = `
function Badge() {}
function Counter() {}
function For() {}
const Unnamed = (() => () => null)()
const Refreshed = { '[solid-refresh]Card': () => null }['[solid-refresh]Card']
`

/** What the panel prints for a `render`, written as a story file writes it, through the real compile. */
async function printed(render: string, state: Record<string, unknown> = {}) {
  const file = join(dir, 'copy.story.tsx')
  writeFileSync(file, `${COMPONENTS}\nconst render = ${render}`)
  // eslint-disable-next-line no-new-func
  const copied = new Function(`${await compileJsxCopy(file)}\nreturn render`)()
  return generateSourceCode({ state, slots: () => ({ jsx: async () => copied }) } as unknown as Variant)
}

describe('a Solid variant\'s Dynamic source', () => {
  it('prints what `render` returns as JSX, children included', async () => {
    expect(await printed(`() => <Badge tone="info">Information</Badge>`)).toBe('<Badge tone="info">Information</Badge>')
  })

  it('prints a value from state as it is now, and a function prop as `…`', async () => {
    expect(await printed(`({ state, setState }) => <Counter count={state.count} onIncrement={() => setState('count', 1)} />`, { count: 10 }))
      .toBe('<Counter count={10} onIncrement={…} />')
  })

  it('takes TypeScript out of the story file', async () => {
    expect(await printed(`(api: { state: { label: string } }) => <Badge tone={api.state.label as string} />`, { label: 'warn' })).toBe('<Badge tone="warn" />')
  })

  it('prints a native element, with Solid\'s `class` and a namespaced handler', async () => {
    expect(await printed(`() => <button class="big" on:click={() => {}}>Press</button>`)).toBe('<button class="big" on:click={…}>Press</button>')
  })

  it('opens a fragment', async () => {
    expect(await printed(`() => <><Badge /><Counter /></>`)).toBe('<>\n  <Badge />\n  <Counter />\n</>')
  })

  it('prints a function child, such as `For` takes, as `…`', async () => {
    expect(await printed(`({ state }) => <For each={state.items}>{item => <li>{item}</li>}</For>`, { items: [1, 2] })).toBe('<For each={[1, 2]}>\n  {…}\n</For>')
  })

  it('prints a component by its own name under Solid\'s hot reload, which renames it', async () => {
    expect(await printed(`() => <Refreshed />`)).toBe('<Card />')
  })

  it('says why, for a component with no name to print', async () => {
    expect(await printed(`() => <Unnamed />`)).toEqual({ unavailable: expect.stringContaining('no name to print') })
  })

  it('has nothing to print for a `render` that returns DOM, as a `solid-js/html` one does', async () => {
    expect(await printed(`() => document.createElement('div')`)).toBeUndefined()
  })

  it('leaves a `render` that throws to the preview, which says why', async () => {
    expect(await printed(`() => { throw new Error('broken') }`)).toBeUndefined()
  })

  it('has nothing to print without a copy', async () => {
    expect(await generateSourceCode({ state: {}, slots: () => ({}) } as unknown as Variant)).toBeUndefined()
  })
})
