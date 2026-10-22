import { describe, expect, it } from 'vitest'
import { HstVue } from '../../index.node.js'

const { match } = HstVue().docgen!

describe('the files Vue auto-docs is offered', () => {
  it('takes a single-file component', () => {
    expect(match('/book/src/components/Button.vue')).toBe(true)
  })

  // A `defineComponent` in a script file, as reka-ui's `Presence` is (#1463).
  it('takes a script file, for a component written with defineComponent', () => {
    expect(match('/book/src/Presence/Presence.ts')).toBe(true)
    expect(match('/book/src/Toggle.tsx')).toBe(true)
  })

  it('leaves out stories, type declarations and installed packages', () => {
    expect(match('/book/src/Button.story.vue')).toBe(false)
    expect(match('/book/src/Button.story.ts')).toBe(false)
    expect(match('/book/src/env.d.ts')).toBe(false)
    expect(match('/book/node_modules/vue/dist/vue.runtime.esm-bundler.js')).toBe(false)
  })
})
