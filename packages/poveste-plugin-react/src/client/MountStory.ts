import type { Story } from '@poveste/shared'
import type { PropType as _PropType } from '@poveste/vendors/vue'
import type { StoryOptions } from '../types.js'
import { applyState, clone, reportStoryError } from '@poveste/shared'
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

    // False in a sandbox realm, which does not own the state (#964): it receives
    // the host's. Applying `initState` there as well would race that copy.
    syncState: {
      type: Boolean,
      default: true,
    },

    // Set by a sandbox; accepted so it is not left as a stray attribute on a
    // component that renders nothing (#197).
    targetVariantId: {
      type: String,
      default: null,
    },
  },

  setup(props) {
    const options = props.story.file?.component as StoryOptions
    const rawVariants = variantOptions(options)

    void Promise.all(props.story.variants.map(async (variant, index) => {
      const rawVariant = rawVariants[index]
      const initState = rawVariant?.initState ?? options.initState
      if (initState && props.syncState) {
        try {
          applyState(variant.state, clone(await initState()))
        }
        catch (error) {
          // Reported rather than left to reject: an unhandled rejection here
          // never marks the variant ready, so the preview stays blank and says
          // nothing. The variant still renders, from the state it has.
          reportStoryError(error, { storyId: props.story.id, variantId: variant.id })
          console.error(error)
        }
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
