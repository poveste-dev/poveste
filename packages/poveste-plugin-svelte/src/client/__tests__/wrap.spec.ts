// @vitest-environment jsdom
import { defineComponent, h, onUnmounted } from '@poveste/vendors/vue'
import { flushSync, mount, unmount } from 'svelte'
import { expect, it } from 'vitest'
import Wrap from '../Wrap.svelte'

it('unmounts the control\'s Vue app when the Svelte wrapper is destroyed', () => {
  let unmounted = false
  const Control = defineComponent({
    name: 'Control',
    setup() {
      onUnmounted(() => {
        unmounted = true
      })
      return () => h('span', 'control')
    },
  })
  const target = document.createElement('div')
  const wrap = mount(Wrap, { target, props: { controlComponent: Control, value: 'text' } })
  flushSync()
  expect(target.textContent).toContain('control')

  unmount(wrap)

  expect(unmounted).toBe(true)
})
