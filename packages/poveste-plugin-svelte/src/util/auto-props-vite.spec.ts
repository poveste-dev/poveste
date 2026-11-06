import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { svelteAutoProps } from './auto-props-vite'
import * as props from './props'

vi.mock('./props', async importOriginal => ({ ...await importOriginal<typeof props>(), extractPropDefs: vi.fn((await importOriginal<typeof props>()).extractPropDefs) }))

const dirs: string[] = []
afterEach(() => {
  dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true }))
  vi.mocked(props.extractPropDefs).mockClear()
})

const STORY = `<script>\n  import Button from './Button.svelte'\n  export let Hst\n</script>\n\n<Hst.Story>\n  <Hst.Variant>\n    <Button />\n  </Hst.Variant>\n</Hst.Story>`

/** A book with one component, two stories that import it, and the plugin context a transform gets. */
function book() {
  const dir = mkdtempSync(join(tmpdir(), 'poveste-auto-props-'))
  dirs.push(dir)
  const button = join(dir, 'Button.svelte')
  writeFileSync(button, `<script>\n  export let label = 'Go'\n</script>\n\n<button>{label}</button>\n`)
  const resolve = vi.fn(async () => ({ id: button }))
  const context = { resolve, addWatchFile: () => {}, warn: () => {} }
  const plugin = svelteAutoProps()
  const transform = (story: string) => plugin.transform.call(context, STORY, join(dir, story))
  return { button, resolve, plugin, transform }
}

describe('auto-props across the stories of a book', () => {
  // Each story resolved and parsed the same component again, and so did a
  // build's second pass: 30 cycles for 12 files in the Svelte example (#476).
  it('resolves and parses a component once for every story and pass that imports it', async () => {
    const { resolve, transform } = book()

    await transform('First.story.svelte')
    await transform('Second.story.svelte')
    await transform('First.story.svelte')

    expect(resolve).toHaveBeenCalledTimes(1)
    expect(props.extractPropDefs).toHaveBeenCalledTimes(1)
  })

  it('parses the component again once its source changes', async () => {
    const { button, transform } = book()
    await transform('First.story.svelte')

    writeFileSync(button, `<script>\n  export let label = 'Stop'\n</script>\n\n<button>{label}</button>\n`)
    const second = await transform('Second.story.svelte')

    expect(props.extractPropDefs).toHaveBeenCalledTimes(2)
    expect(second?.code).toContain('Stop')
  })

  it('resolves again after a file is created or deleted, which can change what a specifier means', async () => {
    const { resolve, plugin, transform } = book()
    await transform('First.story.svelte')

    plugin.watchChange('/somewhere/Other.svelte', { event: 'create' })
    await transform('Second.story.svelte')

    expect(resolve).toHaveBeenCalledTimes(2)
  })
})

// The component's props came from a shared types file the reader didn't open (#501).
describe('auto-props for a component whose props type is imported', () => {
  function typedBook() {
    const dir = mkdtempSync(join(tmpdir(), 'poveste-auto-props-'))
    dirs.push(dir)
    const button = join(dir, 'Button.svelte')
    const types = join(dir, 'types.ts')
    writeFileSync(button, `<script lang="ts">\n  import type { Props } from './types'\n  let { label }: Props = $props()\n</script>\n\n<button>{label}</button>\n`)
    writeFileSync(types, `export interface Props {\n  label: string\n}\n`)
    const resolve = vi.fn(async (specifier: string) => ({ id: specifier === './types' ? types : button }))
    const watched: string[] = []
    const context = { resolve, addWatchFile: (file: string) => watched.push(file), warn: () => {} }
    const plugin = svelteAutoProps()
    const transform = () => plugin.transform.call(context, STORY, join(dir, 'Button.story.svelte'))
    return { types, watched, transform }
  }

  it('types the prop from the imported file, and watches it', async () => {
    const { types, watched, transform } = typedBook()

    const result = await transform()

    expect(result?.code).toContain('"types":["string"]')
    expect(watched).toContain(types)
  })

  it('reads the types file again once it changes, though the component did not', async () => {
    const { types, transform } = typedBook()
    await transform()

    writeFileSync(types, `export interface Props {\n  label: number\n}\n`)
    const second = await transform()

    expect(second?.code).toContain('"types":["number"]')
  })
})
