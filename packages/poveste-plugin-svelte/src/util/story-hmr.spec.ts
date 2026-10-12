import { describe, expect, it, vi } from 'vitest'
import { disableStoryComponentHmr } from './story-hmr.js'

const STORY = '<script>export let Hst</script>\n<Hst.Story title="Demo"><p>demo</p></Hst.Story>\n'
const COMPONENT = '<script>export let label</script>\n<button>{label}</button>\n'

async function hotUpdate(file: string, code: string) {
  const send = vi.fn()
  const modules = await disableStoryComponentHmr().handleHotUpdate({ file, read: () => code, server: { ws: { send } } })
  return { modules, send }
}

/** The options `vite-plugin-svelte` would compile a file with, once this plugin has seen its config. */
async function compileOptionsFor(filename: string, code: string) {
  const svelte = { name: 'vite-plugin-svelte:config', api: { options: {} as Record<string, any> } }
  disableStoryComponentHmr().configResolved({ plugins: [svelte] })
  return svelte.api.options['dynamicCompileOptions']({ filename, code, compileOptions: {} })
}

describe('a story edit in dev', () => {
  // Story component HMR is off, so nothing in the sandbox took the update (#1178).
  it('reloads the book when a story file changes', async () => {
    const { modules, send } = await hotUpdate('/book/src/Demo.story.svelte', STORY)

    expect(send).toHaveBeenCalledWith({ type: 'full-reload' })
    expect(modules).toEqual([])
  })

  it('leaves a component edit to Svelte HMR', async () => {
    const { modules, send } = await hotUpdate('/book/src/Demo.svelte', COMPONENT)

    expect(send).not.toHaveBeenCalled()
    expect(modules).toBeUndefined()
  })
})

// A book may set `storyMatch: ['src/stories/**/*.svelte']`. Its stories were
// collected and rendered, and a `.story.svelte` pattern here did not know them:
// component HMR stayed on for every one, with nothing printed (#474).
describe('a story that is not named .story.svelte', () => {
  const FILE = '/book/src/stories/Demo.svelte'

  it('is compiled without component HMR', async () => {
    expect(await compileOptionsFor(FILE, STORY)).toEqual({ hmr: false })
  })

  it('reloads the book when it changes', async () => {
    const { modules, send } = await hotUpdate(FILE, STORY)

    expect(send).toHaveBeenCalledWith({ type: 'full-reload' })
    expect(modules).toEqual([])
  })

  it('is told from a component in the same folder by what it renders', async () => {
    expect(await compileOptionsFor('/book/src/stories/Button.svelte', COMPONENT)).toBeUndefined()
  })
})
