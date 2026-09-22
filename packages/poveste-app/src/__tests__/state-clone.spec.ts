import { describe, expect, it, vi } from 'vitest'
import { markRaw, ref } from 'vue'
import { toPresetState, toRawDeep } from '../app/util/state'

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

describe('a binding Vue has marked raw', () => {
  it('is dropped from what leaves the realm, rather than passed through', () => {
    const graph = markRaw({ nodes: { deep: { deeper: 1 } } })

    // `clean` means this copy is posted or persisted. `__v_skip` is
    // non-enumerable and does not survive `structuredClone`, so passing the
    // value would hand the far side an unmarked graph to deep-watch — which is
    // the hanging story #957 describes. The key does not go.
    expect(toRawDeep({ text: 'a', graph }, true)).toEqual({ text: 'a' })
  })

  it('is carried by reference when the copy stays in this realm', () => {
    const graph = markRaw({ nodes: { deep: 1 } })
    const copied = toRawDeep({ text: 'a', graph })

    // Same identity, not a rebuilt one: that is what lets the compare settle it
    // by `Object.is` instead of walking whatever is behind it.
    expect(copied.graph).toBe(graph)
    expect(copied.text).toBe('a')
  })

  it('is unwrapped from a ref first, which is the shape a template ref has', () => {
    const graph = ref(markRaw({ nodes: { deep: 1 } }))

    expect(toRawDeep({ graph }, true)).toEqual({})
    expect(toRawDeep({ graph }).graph).toBe(graph.value)
  })

  it('leaves an array the way a function does', () => {
    // Filtered, indices and all. Stated because it is a real consequence and
    // not an obviously right one — it is the rule functions already follow.
    expect(toRawDeep({ list: [1, markRaw({ a: 1 }), 2] }, true)).toEqual({ list: [1, 2] })
  })

  it('does not take the whole state with it when the state itself is marked', () => {
    expect(toRawDeep(markRaw({ text: 'a' }), true)).toEqual({})
  })

  it('takes only itself when it sits inside an ordinary object', () => {
    const state = { config: { zoom: 3, map: markRaw({ tiles: { deep: 1 } }) } }

    // The far side keeps whatever it had under `config.map`, because a key that
    // is not sent is a key `applyState` cannot overwrite — it merges one level.
    expect(toRawDeep(state, true)).toEqual({ config: { zoom: 3 } })
  })

  it('never reaches a preset', () => {
    const graph = markRaw({ nodes: { deep: 1 } })

    expect(toPresetState({ count: 1, graph })).toEqual({ count: 1 })
  })
})
