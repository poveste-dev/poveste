import type { ControlElement, ControlSlotCall } from '@poveste/controls'
import type {
  App,
} from 'vue'
import {
  components,
  controlElementTag,
  defineControlElements,
  SLOT_CONTENT_ATTR,
} from '@poveste/controls'
import {
  defineComponent,
  h,
  onMounted,
  onUpdated,
  ref,
  shallowRef,
} from 'vue'
import Story from './Story.js'
import Variant from './Variant.js'

export function registerGlobalComponents(app: App) {
  app.component('Story', Story)

  app.component('Variant', Variant)

  registerControlComponents(app)
}

export function registerControlComponents(app: App) {
  defineControlElements()
  for (const [key, component] of Object.entries(components)) {
    app.component(key, wrapControlComponent(key, component.name))
  }
}

/**
 * A control as the story's own component, rendering the control's element.
 *
 * Named as the control is, and declaring no props, so the Source panel prints it and
 * auto-props passes over it as they did the bridge this replaces.
 */
function wrapControlComponent(key: string, name: string | undefined) {
  const tag = controlElementTag(key)

  return defineComponent({
    ...name ? { name } : {},
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      const el = ref<ControlElement>()
      const source = ref<HTMLElement>()
      const calls = shallowRef<readonly ControlSlotCall[]>([])

      function attachSource() {
        if (el.value) {
          el.value.slotSource = source.value ?? null
        }
      }
      onMounted(attachSource)
      onUpdated(attachSource)

      return () => {
        const names = Object.keys(slots)
        return [
          // Everything in one property, listeners included. As attributes, Vue's DOM
          // patcher would skip `onUpdate:modelValue`: a `v-model` listener is meant for a
          // component, and to Vue a custom element is a native one.
          h(tag, {
            'ref': el,
            '.props': { ...attrs },
            '.slots': names,
            'onPovesteSlots': () => {
              calls.value = el.value?.slotCalls ?? []
            },
          }),
          names.length
            ? h('span', { ref: source, hidden: true }, calls.value.map((call, index) => h('span', {
                key: index,
                [SLOT_CONTENT_ATTR]: index,
                style: { display: 'contents' },
              }, slots[call.name]?.(call.props))))
            : null,
        ]
      }
    },
  })
}
