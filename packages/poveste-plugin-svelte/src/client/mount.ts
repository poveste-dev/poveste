import type { Story } from '@poveste/shared'
import type {
  PropType as _PropType,
} from '@poveste/vendors/vue'
import type { SvelteStorySetupApi } from '../helpers.js'
import { components } from '@poveste/controls'
import {
  defineComponent as _defineComponent,
  h as _h,
  onMounted as _onMounted,
  onUnmounted as _onUnmounted,
  ref as _ref,
  watch as _watch,
} from '@poveste/vendors/vue'
import { writable } from 'svelte/store'
// @ts-expect-error virtual module id
import * as generatedSetup from 'virtual:$poveste-generated-global-setup'
// @ts-expect-error virtual module id
import * as setup from 'virtual:$poveste-setup'
import {
  callSetupFunctions,
  mountSvelteComponent,
} from '../util/svelte.js'
import MountStorySvelte from './MountStory.svelte'
import MountVariantSvelte from './MountVariant.svelte'
import StubComponent from './Stub.svelte'

export default _defineComponent({
  name: 'MountStory',

  props: {
    story: {
      type: Object as _PropType<Story>,
      required: true,
    },

    // Set by a sandbox: the one variant this realm serves. The story's `{#each}`
    // still instantiates a MountVariant per variant — that is the user's
    // template — but the others can skip their bookkeeping (#197).
    targetVariantId: {
      type: String,
      default: null,
    },
  },

  setup(props) {
    const el = _ref<HTMLDivElement>()
    let app: any
    let target: HTMLDivElement
    let destroyApp: (() => void) | null = null

    // A store rather than a value, so a retargeted realm (#240) can tell the
    // variant it now serves to register without remounting the story — the
    // context is fixed at mount, a store subscription is not.
    const targetVariantId = writable<string | null>(props.targetVariantId)
    _watch(() => props.targetVariantId, (id) => {
      targetVariantId.set(id)
    })

    async function mountStory() {
      target = document.createElement('div')
      el.value.appendChild(target)

      const mountedApp = await mountSvelteComponent(props.story.file.component, {
        target,
        props: {
          Hst: {
            Story: MountStorySvelte,
            Variant: MountVariantSvelte,
            ...getControls(),
          },
        },
        context: new Map(Object.entries({
          __pvtStory: props.story,
          __pvtTargetVariantId: targetVariantId,
        })),
      }, 'client', { storyId: props.story.id, variantId: props.targetVariantId ?? undefined })
      app = mountedApp.app
      destroyApp = mountedApp.destroy

      const setupApi: SvelteStorySetupApi = {
        app,
        story: props.story,
        variant: null,
      }

      await callSetupFunctions(generatedSetup, setup, setupApi)
    }

    function unmountStory() {
      destroyApp?.()
      destroyApp = null
      if (target) {
        target.parentNode?.removeChild(target)
        target = null
      }
      app = null
    }

    _watch(() => props.story.id, async () => {
      unmountStory()
      await mountStory()
    })

    _onMounted(async () => {
      await mountStory()
    })

    _onUnmounted(() => {
      unmountStory()
    })

    return {
      el,
    }
  },

  render() {
    return _h('div', {
      ref: 'el',
    })
  },
})

function getControls() {
  const result: Record<string, any> = {}
  for (const key in components) {
    result[key.substring(3)] = StubComponent
  }
  return result
}
