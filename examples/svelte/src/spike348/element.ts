// SPIKE #348 — not for merge.
//
// `shadowRoot: false` because the package's dark mode is keyed on `.ptw-dark` on
// `<html>`: a selector inside a shadow root cannot match an ancestor outside it.
import { HstText } from '@poveste/controls'
import { defineComponent, defineCustomElement, h } from '@poveste/vendors/vue'

const PvtText = defineCustomElement(HstText as any, { shadowRoot: false })

if (!customElements.get('pvt-text')) {
  customElements.define('pvt-text', PvtText)
}

/*
 * The same control behind a `value` prop and a native `input` event, which is the
 * pair Svelte's `bind:value` actually speaks. One Vue-side shim for every control,
 * rather than one hand-written bridge per framework.
 */
const ValueAliased = defineComponent({
  props: { value: { type: String, default: '' }, title: { type: String, default: '' } },
  emits: ['input'],
  setup(props, { emit }) {
    return () => h(HstText as any, {
      'title': props.title,
      'modelValue': props.value,
      'onUpdate:modelValue': (v: string) => emit('input', v),
    })
  },
})

const PvtText2 = defineCustomElement(ValueAliased, { shadowRoot: false })

if (!customElements.get('pvt-text2')) {
  customElements.define('pvt-text2', PvtText2)
}

export {}

/*
 * Slots, both ways round. Native projection needs a shadow root; the dark mode
 * this package ships needs no shadow root. This pair is the experiment.
 */
const Slotted = defineComponent({
  props: { title: { type: String, default: '' } },
  setup(props, { slots }) {
    return () => h('div', { class: 'slot-probe' }, [
      h('span', { 'data-part': 'title' }, props.title),
      h('span', { 'data-part': 'default' }, slots.default ? slots.default() : ['NO DEFAULT SLOT']),
      h('span', { 'data-part': 'actions' }, slots.actions ? slots.actions() : ['NO ACTIONS SLOT']),
    ])
  },
})

if (!customElements.get('pvt-slot-light')) {
  customElements.define('pvt-slot-light', defineCustomElement(Slotted, { shadowRoot: false }))
}
if (!customElements.get('pvt-slot-shadow')) {
  customElements.define('pvt-slot-shadow', defineCustomElement(Slotted))
}

// The faithful version: a real control whose SFC template contains
// `<slot name="actions" />`, compiled both ways.
import { HstSelect } from '@poveste/controls'

if (!customElements.get('pvt-select-light')) {
  customElements.define('pvt-select-light', defineCustomElement(HstSelect as any, { shadowRoot: false }))
}
if (!customElements.get('pvt-select-shadow')) {
  customElements.define('pvt-select-shadow', defineCustomElement(HstSelect as any))
}
