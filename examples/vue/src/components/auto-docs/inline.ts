import { defineComponent, h } from 'vue'

// A component defined in a module, not a file of its own: auto-docs cannot read it.
export const AutoDocsInline = defineComponent({
  props: { label: String },
  setup: props => () => h('span', props.label),
})
