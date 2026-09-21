import { describe, expect, it } from 'vitest'
import HstColorComponent from './components/color/HstColor.vue'
import HstDateComponent from './components/date/HstDate.vue'
import HstJsonComponent from './components/json/HstJson.vue'
import { HstColor, HstDate, HstJson } from './index'

// The lazily loaded controls, and what `defineAsyncComponent`'s wrapper does not
// carry. `@poveste/plugin-svelte`'s Wrap.svelte reads `name` and `emits` off it
// to build the Vue listeners, so a wrapper missing them renders a control that
// edits and never writes back — silently, and in only one of the two plugins
// (#374). They are hand-copied, so they are pinned against the real component.
const LAZY = [
  { name: 'HstJson', wrapper: HstJson, component: HstJsonComponent },
  { name: 'HstDate', wrapper: HstDate, component: HstDateComponent },
  { name: 'HstColor', wrapper: HstColor, component: HstColorComponent },
]

/** `defineEmits` compiles to an array from a type and an object from a literal. */
function emitNames(emits: unknown): string[] {
  return (Array.isArray(emits) ? emits : Object.keys(emits as object)).sort()
}

describe.each(LAZY)('the lazily loaded $name', ({ name, wrapper, component }) => {
  it('carries the name the Svelte bridge and codegen read', () => {
    expect(wrapper.name).toBe(name)
    expect(wrapper.name).toBe((component as { name: string }).name)
  })

  it('carries the same emits as the component it loads', () => {
    expect(emitNames(wrapper.emits)).toEqual(emitNames((component as { emits: unknown }).emits))
  })

  it('is still lazy, so it is not in the entry', () => {
    expect(wrapper).toHaveProperty('__asyncLoader')
  })
})
