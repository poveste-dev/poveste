import type { Story } from '@poveste/shared'
import type { PropType as _PropType } from '@poveste/vendors/vue'
import type { StoryOptions } from '../types.js'
import { applyState, clone } from '@poveste/shared'
import { defineComponent as _defineComponent } from '@poveste/vendors/vue'
import { variantOptions } from '../types.js'
import { NO_CONTROLS } from './no-controls.js'

export default _defineComponent({
  name: 'MountStory',

  props: {
    story: {
      type: Object as _PropType<Story>,
      required: true,
    },
  },

  setup(props) {
    const options = props.story.file?.component as StoryOptions
    const rawVariants = variantOptions(options)

    void Promise.all(props.story.variants.map(async (variant, index) => {
      const rawVariant = rawVariants[index]
      const initState = rawVariant?.initState ?? options.initState
      if (initState) {
        applyState(variant.state, clone(await initState()))
      }

      Object.assign(variant, {
        // A variant with state gets the panel's state editor; one without gets
        // the explanation, which is a custom controls slot to the panel.
        slots: () => ({ default: rawVariant?.render, controls: initState ? undefined : NO_CONTROLS }),
        source: rawVariant?.source ?? options.source,
        responsiveDisabled: rawVariant?.responsiveDisabled ?? options.responsiveDisabled,
        autoPropsDisabled: true,
        setupApp: rawVariant?.setupApp ?? options.setupApp,
        configReady: true,
      })
    }))
  },

  render() {
    return null
  },
})
