import type { Story, Variant } from '@poveste/shared'
import type { PropType as _PropType } from '@poveste/vendors/vue'
import type { ReactNode } from 'react'
import type { Root } from 'react-dom/client'
import type { ReactRenderApi, ReactStorySetupApi, ReactStorySetupHandler, ReactWrapper } from '../types.js'
import { getSetupHook as _getSetupHook, clone, isEquivalent, reportStoryError } from '@poveste/shared'
import {
  defineComponent as _defineComponent,
  h as _h,
  onBeforeUnmount as _onBeforeUnmount,
  onMounted as _onMounted,
  ref as _ref,
  toRaw as _toRaw,
  watch as _watch,
} from '@poveste/vendors/vue'
import { createElement, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
// @ts-expect-error virtual module id
import * as generatedSetup from 'virtual:$poveste-generated-global-setup'
// @ts-expect-error virtual module id
import * as setup from 'virtual:$poveste-setup'
import { REACT_SETUP_HOOK_NAMES } from '../index.js'
import { NO_CONTROLS, NO_CONTROLS_MESSAGE } from './no-controls.js'

type State = Record<string, any>

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
    let root: Root | undefined
    let stopSync: (() => void) | undefined
    let mounting = false

    async function mount() {
      if (!props.variant.configReady) {
        return
      }
      // Checked before the element: the explanation renders no `el`, and the
      // panel waits on this `ready` before it shows its toolbar.
      if (explainsControls()) {
        emit('ready')
        return
      }
      if (mounting || root || !el.value) {
        return
      }
      const renderVariant = slot() as ((api: ReactRenderApi<any>) => ReactNode) | undefined
      if (!renderVariant) {
        return
      }
      mounting = true

      // Hooks run before mount, as in `@poveste/plugin-vue`, so a wrapper they
      // add is in place for the first render rather than arriving after it.
      const wrappers: ReactWrapper[] = []
      const setupApi: ReactStorySetupApi = {
        story: props.story,
        variant: props.variant,
        addWrapper: (wrapper) => {
          wrappers.unshift(wrapper)
        },
      }
      const occupant = { storyId: props.story.id, variantId: props.variant.id }

      try {
        await _getSetupHook<ReactStorySetupHandler>(generatedSetup, REACT_SETUP_HOOK_NAMES)?.(setupApi)
        await _getSetupHook<ReactStorySetupHandler>(setup, REACT_SETUP_HOOK_NAMES)?.(setupApi)
        await (props.variant.setupApp as ReactStorySetupHandler | undefined)?.(setupApi)

        // A hook that awaited can outlive this component, whose element is gone
        // by then; rendering now would leave a React root and a watcher that no
        // unmount will ever reach.
        if (!el.value) {
          return
        }

        // React reads state as a snapshot, so the variant's reactive state is
        // copied out and replaced whole on each change: a new object is what
        // tells `useSyncExternalStore` to render again.
        const store = snapshotStore(clone(_toRaw(props.variant.state) ?? {}))
        const setState: ReactRenderApi<State>['setState'] = (next) => {
          const current = store.get()
          const merged = { ...current, ...(typeof next === 'function' ? next(current) : next) }
          store.set(merged)
          writeBack(props.variant.state, merged)
        }

        stopSync = _watch(() => props.variant.state, (value) => {
          const incoming = clone(_toRaw(value))
          if (!isEquivalent(incoming, store.get())) {
            store.set(incoming)
          }
        }, { deep: true })

        function Variant() {
          const state = useSyncExternalStore(store.subscribe, store.get)
          return renderVariant!({ state, setState })
        }

        let node: ReactNode = createElement(Variant)
        for (const wrapper of wrappers) {
          node = createElement(wrapper, { story: props.story, variant: props.variant, children: node })
        }

        root = createRoot(el.value, {
          // A render that throws is reported here rather than to the window,
          // where nothing would tie it to the variant that threw.
          onUncaughtError: (error) => {
            reportStoryError(error, occupant)
            console.error(error)
          },
        })
        // Synchronously, so `ready` means the story is in the DOM rather than
        // scheduled to be.
        flushSync(() => root!.render(node))
      }
      catch (error) {
        // Whatever got as far as existing goes with the failure, so a later
        // attempt starts clean rather than beside a watcher nothing can stop.
        unmount()
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
      root?.unmount()
      root = undefined
    }

    _onMounted(mount)
    _watch(() => props.variant.configReady, mount)
    _onBeforeUnmount(unmount)

    return { el, explainsControls }
  },

  render() {
    if (this.explainsControls()) {
      return _h('p', { class: 'poveste-react-no-controls', style: 'padding: 12px; opacity: 0.7; font-size: 12px' }, NO_CONTROLS_MESSAGE)
    }
    return _h('div', { ref: 'el' })
  },
})

function snapshotStore(initial: State) {
  let snapshot = initial
  const listeners = new Set<() => void>()
  return {
    get: () => snapshot,
    set: (next: State) => {
      snapshot = next
      for (const listener of listeners) listener()
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/**
 * Carries the snapshot back to the variant's state one key at a time: only what
 * changed is cloned, and a key the snapshot no longer has is removed rather than
 * left behind. The `_h` keys are the app's own and are never the story's to drop.
 */
function writeBack(target: State, snapshot: State) {
  for (const key of Object.keys(target)) {
    if (!key.startsWith('_h') && !Object.hasOwn(snapshot, key)) {
      delete target[key]
    }
  }
  for (const key of Object.keys(snapshot)) {
    if (!Object.hasOwn(target, key) || !isEquivalent(target[key], snapshot[key])) {
      target[key] = clone(snapshot[key])
    }
  }
}
