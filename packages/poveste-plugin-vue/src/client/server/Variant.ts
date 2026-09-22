import type { ServerVariant } from '@poveste/shared'
import type { PropType } from 'vue'
import { defineComponent } from 'vue'
import { addVariantContext, serverStoryContext } from './context.js'

export default defineComponent({
  name: 'PovesteVariant',

  props: {
    title: {
      type: String,
      default: 'untitled',
    },

    id: {
      type: String,
      default: undefined,
    },

    icon: {
      type: String,
      default: undefined,
    },

    iconColor: {
      type: String,
      default: undefined,
    },

    meta: {
      type: Object as PropType<ServerVariant['meta']>,
      default: undefined,
    },
  },

  setup(props) {
    // Asked for before anything reads it, so a missing `<Story>` is reported
    // once and the same way whether or not the variant carries an `id`. The
    // guard this replaces sat inside the branch that generates one, so an
    // explicit `id` skipped it and reached `undefined(variant)` instead (#981).
    const story = serverStoryContext.inject('<Variant>')
    const addVariant = addVariantContext.inject('<Variant>')

    addVariant({
      id: props.id ?? `${story.id}-${story.variants.length}`,
      title: props.title,
      icon: props.icon,
      iconColor: props.iconColor,
      meta: props.meta,
    })
  },

  render() {
    return null
  },
})
