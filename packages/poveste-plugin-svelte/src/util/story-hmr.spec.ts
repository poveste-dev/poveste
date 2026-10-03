import { describe, expect, it, vi } from 'vitest'
import { disableStoryComponentHmr } from './story-hmr.js'

function hotUpdate(file: string) {
  const send = vi.fn()
  const modules = disableStoryComponentHmr().handleHotUpdate({ file, server: { ws: { send } } })
  return { modules, send }
}

describe('a story edit in dev', () => {
  // Story component HMR is off, so nothing in the sandbox took the update (#1178).
  it('reloads the book when a story file changes', () => {
    const { modules, send } = hotUpdate('/book/src/Demo.story.svelte')

    expect(send).toHaveBeenCalledWith({ type: 'full-reload' })
    expect(modules).toEqual([])
  })

  it('leaves a component edit to Svelte HMR', () => {
    const { modules, send } = hotUpdate('/book/src/Demo.svelte')

    expect(send).not.toHaveBeenCalled()
    expect(modules).toBeUndefined()
  })
})
