import { describe, expect, it, vi } from 'vitest'
import { toPresetState } from '../app/util/state'

/**
 * What the state-presets panel does to a variant's state before storing it.
 * `ComplexParameter.story.vue` builds both shapes this has to survive: a prop
 * holding a callback, and a pair of objects that reference each other.
 */
const asPreset = (state: Record<string, any>) => toPresetState(state)

function stateWithACallbackAndACycle() {
  const parent: Record<string, any> = { name: 'hello' }
  const child: Record<string, any> = {}
  parent.child = child
  child.parent = parent

  return {
    complexParameter: [{ action: () => {} }],
    recursiveParameter: parent,
    count: 1,
  }
}

describe('a variant\'s state as a preset', () => {
  it('is detached from the state it was taken from', () => {
    const state = stateWithACallbackAndACycle()

    const preset = asPreset(state)
    state.recursiveParameter.name = 'edited'

    expect(preset.recursiveParameter.name).toBe('hello')
  })

  it('keeps a self-referential prop as a cycle, which is what it is', () => {
    const preset = asPreset(stateWithACallbackAndACycle())

    expect(preset.recursiveParameter.child.parent).toBe(preset.recursiveParameter)
  })

  it('drops the callback, which no stored preset could carry anyway', () => {
    const preset = asPreset(stateWithACallbackAndACycle())

    expect(preset.complexParameter).toEqual([{}])
  })

  // The whole of the defect: the copy came out correct either way, but a story
  // with a callback in its props logged a warning and an error on every mount.
  it('does so without falling back, so nothing is logged at the reader', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    asPreset(stateWithACallbackAndACycle())

    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    warn.mockRestore()
    error.mockRestore()
  })

  it('still copies the ordinary values beside them', () => {
    const preset = asPreset(stateWithACallbackAndACycle())

    expect(preset.count).toBe(1)
    expect(preset.recursiveParameter.name).toBe('hello')
  })
})
