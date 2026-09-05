import { describe, expect, it } from 'vitest'
import HstJsonComponent from './components/json/HstJson.vue'
import { HstJson } from './index'

// `HstJson` is lazily loaded, and `defineAsyncComponent`'s wrapper carries none
// of the component's own surface. `@poveste/plugin-svelte`'s Wrap.svelte reads
// `name` and `emits` off it to build the Vue listeners, so a wrapper missing
// them renders a control that edits and never writes back — silently, and in
// only one of the two plugins (#374).
describe('the lazily loaded HstJson', () => {
  it('carries the name the Svelte bridge and codegen read', () => {
    expect(HstJson.name).toBe(HstJsonComponent.name)
  })

  it('carries the same emits as the component it loads', () => {
    expect([...HstJson.emits].sort()).toEqual(Object.keys(HstJsonComponent.emits).sort())
  })

  it('is still lazy, so the editor is not in the entry', () => {
    expect(HstJson).toHaveProperty('__asyncLoader')
  })
})
