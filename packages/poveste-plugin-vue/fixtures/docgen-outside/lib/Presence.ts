import { defineComponent, h } from 'vue'

export default defineComponent({
  name: 'Presence',
  props: {
    /** Whether the child is mounted. */
    present: { type: Boolean, required: true },
  },
  setup: (_, { slots }) => () => h('div', slots.default?.()),
})
