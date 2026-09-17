import type {
  App as _App,
  Component as _Component,
} from '@poveste/vendors/vue'
import type {
  App,
} from 'vue'
import { components } from '@poveste/controls'
import {
  createApp as _createApp,
  h as _h,
  reactive as _reactive,
} from '@poveste/vendors/vue'
import {
  defineComponent,
  h,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  onUpdated,
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

function wrapControlComponent(controlComponent: (typeof components)[keyof typeof components]) {
  // Which control this is decides at runtime, and its props are the story's untyped
  // attrs, so it renders through Vue's dynamic `Component` rather than a union of every
  // control's props, where a slider would be claimed renderable without `min` (#835).
  const dynamicControl: _Component = controlComponent

  return defineComponent({
    name: controlComponent.name,
    inheritAttrs: false,
    setup(props, { attrs }) {
      const el = ref<HTMLDivElement>()
      const slotEl = ref<HTMLDivElement>()

      // Attrs

      const state = _reactive({})

      function applyState(data: Record<string, unknown>) {
        Object.assign(state, data)
      }

      applyState(attrs)
      onBeforeUpdate(() => {
        applyState(attrs)
      })

      // Slots

      let newSlotCalls: Record<string, unknown>[] = []
      const slotCalls = ref<Record<string, unknown>[]>([])

      function moveSlotContent() {
        slotCalls.value.forEach((props, index) => {
          const renderedEl = slotEl.value?.querySelector(`[renderslotid="${index}"]`)
          const targetEl = el.value?.querySelector(`[slotid="${index}"]`)
          if (!renderedEl || !targetEl) return
          while (targetEl.lastChild) {
            targetEl.removeChild(targetEl.lastChild)
          }
          targetEl.appendChild(renderedEl)
        })
      }

      // App

      let app: _App

      onMounted(() => {
        app = _createApp({
          mounted() {
            slotCalls.value = newSlotCalls
            newSlotCalls = []
          },
          updated() {
            slotCalls.value = newSlotCalls
            newSlotCalls = []
          },
          render() {
            return _h(dynamicControl, {
              ...state,
              key: 'component',
            }, {
              default: (props: Record<string, unknown>) => {
                newSlotCalls.push(props)
                return _h('div', {
                  slotId: newSlotCalls.length - 1,
                })
              },
            })
          },
        })
        app.mount(el.value)
      })

      onUpdated(() => {
        moveSlotContent()
      })

      onBeforeUnmount(() => {
        app.unmount()
      })

      return {
        el,
        slotEl,
        slotCalls,
      }
    },
    render() {
      return [
        h('div', {
          ref: 'el',
        }),
        h('div', {
          ref: 'slotEl',
        }, this.slotCalls.map((props, index) => h('div', {
          renderSlotId: index,
        }, this.$slots.default?.(props)))),
      ]
    },
  })
}
