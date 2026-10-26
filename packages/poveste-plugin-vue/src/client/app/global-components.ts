import type {
  App,
} from 'vue'
import { components } from '@poveste/controls'
import { defineCustomElement } from '@poveste/vendors/vue'
import {
  defineComponent,
  h,
  onMounted,
  ref,
} from 'vue'
import Story from './Story.js'
import Variant from './Variant.js'

export function registerGlobalComponents(app: App) {
  app.component('Story', Story)

  app.component('Variant', Variant)

  for (const [key, component] of Object.entries(components)) {
    app.component(key, wrapControlComponent(component))
  }
}

// MEASUREMENT ONLY (#1114) — the bridge replaced by a generic custom-element wrapper.
const tags = new Map<unknown, string>()
for (const [key, component] of Object.entries(components)) {
  const tag = `pvt-${key.replace(/[A-Z]/g, (c, i) => (i ? '-' : '') + c.toLowerCase())}`
  tags.set(component, tag)
  if (!customElements.get(tag)) {
    customElements.define(tag, defineCustomElement(component as any, { shadowRoot: false }))
  }
}

function wrapControlComponent(controlComponent: (typeof components)[keyof typeof components]) {
  const tag = tags.get(controlComponent)!
  return defineComponent({
    ...controlComponent.name ? { name: controlComponent.name } : {},
    inheritAttrs: false,
    setup(_props, { attrs }) {
      // Vue's DOM patcher skips `onUpdate:*` on a native element — it is a v-model
      // listener, meant for components — and a custom element counts as native.
      const el = ref<HTMLElement>()
      onMounted(() => {
        for (const key of Object.keys(attrs).filter(key => /^on[A-Z]/.test(key))) {
          const event = key[2]!.toLowerCase() + key.slice(3)
          el.value!.addEventListener(event, (e) => {
            (attrs[key] as ((...args: unknown[]) => void) | undefined)?.(...((e as CustomEvent).detail ?? []))
          })
        }
      })
      return () => h(tag, { ref: el, ...Object.fromEntries(Object.entries(attrs).filter(([key]) => !/^on[A-Z]/.test(key))) })
    },
  })
}
