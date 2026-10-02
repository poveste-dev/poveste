import type { Story, Variant } from '@poveste/shared'
import type { PropType as _PropType } from '@poveste/vendors/vue'
import type { JSX } from 'solid-js'
import type { SolidRenderApi, SolidStorySetupApi, SolidStorySetupHandler, SolidWrapper } from '../types.js'
import { getSetupHook as _getSetupHook, applyState, clone, reportStoryError } from '@poveste/shared'
import {
  defineComponent as _defineComponent,
  h as _h,
  onBeforeUnmount as _onBeforeUnmount,
  onMounted as _onMounted,
  ref as _ref,
  toRaw as _toRaw,
  watch as _watch,
} from '@poveste/vendors/vue'
import { createComponent, untrack } from 'solid-js'
import { createStore, reconcile, unwrap } from 'solid-js/store'
import { render } from 'solid-js/web'
// @ts-expect-error virtual module id
import * as generatedSetup from 'virtual:$poveste-generated-global-setup'
// @ts-expect-error virtual module id
import * as setup from 'virtual:$poveste-setup'
import { SOLID_SETUP_HOOK_NAMES } from '../index.js'
import { NO_CONTROLS, NO_CONTROLS_MESSAGE } from './no-controls.js'

export default _defineComponent({
  name: 'RenderStory',

  props: {
    variant: {
      type: Object as _PropType<Variant>,
      required: true,
    },

    story: {
      type: Object as _PropType<Story>,
      required: true,
    },

    slotName: {
      type: String,
      default: 'default',
    },
  },

  emits: {
    ready: () => true,
  },

  setup(props, { emit }) {
    const el = _ref<HTMLDivElement>()
    const slot = () => Reflect.get(props.variant.slots?.() ?? {}, props.slotName)
    const explainsControls = () => slot() === NO_CONTROLS
    let dispose: (() => void) | undefined
    let stopSync: (() => void) | undefined
    let mounting = false

    async function mount() {
      if (mounting || dispose || !el.value || !props.variant.configReady) {
        return
      }
      if (explainsControls()) {
        emit('ready')
        return
      }
      const renderVariant = slot() as ((api: SolidRenderApi<any>) => JSX.Element) | undefined
      if (!renderVariant) {
        return
      }
      mounting = true

      // Hooks run before mount, as in `@poveste/plugin-vue`, so a wrapper they
      // add is in place for the first render rather than arriving after it.
      const wrappers: SolidWrapper[] = []
      const setupApi: SolidStorySetupApi = {
        story: props.story,
        variant: props.variant,
        addWrapper: (wrapper) => {
          wrappers.unshift(wrapper)
        },
      }
      const occupant = { storyId: props.story.id, variantId: props.variant.id }

      try {
        await _getSetupHook<SolidStorySetupHandler>(generatedSetup, SOLID_SETUP_HOOK_NAMES)?.(setupApi)
        await _getSetupHook<SolidStorySetupHandler>(setup, SOLID_SETUP_HOOK_NAMES)?.(setupApi)
        await (props.variant.setupApp as SolidStorySetupHandler | undefined)?.(setupApi)

        // A store, because a Solid component runs once: a change has to reach
        // the DOM through the reads it tracked, not by rendering again.
        // `reconcile` keeps the store's identities where the incoming state is
        // equal, so only the reads of what actually changed re-run.
        const [state, setStore] = createStore<Record<string, any>>(clone(_toRaw(props.variant.state) ?? {}))
        const setState = ((...args: unknown[]) => {
          (setStore as (...args: unknown[]) => void)(...args)
          applyState(props.variant.state, clone(unwrap(state)))
        }) as SolidRenderApi<any>['setState']

        stopSync = _watch(() => props.variant.state, (value) => {
          setStore(reconcile(clone(_toRaw(value))))
        }, { deep: true })

        let node = (): JSX.Element => renderVariant({ state, setState })
        for (const wrapper of wrappers) {
          const inner = node
          node = () => createComponent(wrapper, {
            story: props.story,
            variant: props.variant,
            get children() {
              return inner()
            },
          })
        }

        dispose = render(() => untrack(node), el.value)
      }
      catch (error) {
        reportStoryError(error, occupant)
        console.error(error)
      }
      finally {
        mounting = false
      }

      emit('ready')
    }

    function unmount() {
      stopSync?.()
      stopSync = undefined
      dispose?.()
      dispose = undefined
    }

    _onMounted(mount)
    _watch(() => props.variant.configReady, mount)
    _onBeforeUnmount(unmount)

    return { el, explainsControls }
  },

  render() {
    if (this.explainsControls()) {
      return _h('p', { class: 'poveste-solid-no-controls', style: 'padding: 12px; opacity: 0.7; font-size: 12px' }, NO_CONTROLS_MESSAGE)
    }
    return _h('div', { ref: 'el' })
  },
})
