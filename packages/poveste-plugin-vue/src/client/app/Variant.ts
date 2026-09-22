import type { Variant } from '@poveste/shared'
import type { PropType } from 'vue'
import type { PreviewRenderContext } from './render-context.js'
import { applyState, autoPropsStateKeys } from '@poveste/shared'
import { computed, defineComponent, onBeforeUnmount, useAttrs } from 'vue'
import { syncVariantAutoProps } from './auto-props.js'
import { implicitStateContext, storyContext } from './context.js'
import { useRenderContext } from './render-context.js'
import { syncStateBundledAndExternal, toRawDeep, useInstance } from './util.js'

// const logLocation = location.href.includes('__sandbox') ? '[Sandbox]' : '[Host]'

export default defineComponent({

  name: 'Variant',
  __povesteType: 'variant',

  props: {
    initState: {
      type: Function as PropType<() => any | Promise<any>>,
      default: undefined,
    },

    source: {
      type: String,
      default: undefined,
    },

    responsiveDisabled: {
      type: Boolean,
      default: false,
    },

    autoPropsDisabled: {
      type: Boolean,
      default: false,
    },

    setupApp: {
      type: Function,
      default: undefined,
    },

    meta: {
      type: Object as PropType<Variant['meta']>,
      default: undefined,
    },

    implicit: {
      type: Boolean,
      default: false,
    },
  },

  async setup(props) {
    const attrs = useAttrs() as {
      variant?: Variant
    }
    const vm = useInstance('Variant')
    const story = storyContext.injectOptional()
    const implicitState = implicitStateContext.injectOptional()
    const renderContext = useRenderContext()
    let lastPropsTypesSnapshot: string
    let renderVariant: Variant | undefined
    let renderStateSync: ReturnType<typeof syncStateBundledAndExternal> | null = null
    let mountStateSync: ReturnType<typeof syncStateBundledAndExternal> | undefined

    // Registered before the first `await` below, and deliberately so. This is
    // an async setup(), and Vue drops any lifecycle hook registered after an
    // await has actually suspended — it warns, then the hook is bound to no
    // instance and never runs. That is how both state syncs below used to
    // survive unmount: a story with `initState` suspends here, so the teardown
    // that used to sit at the bottom of setup() was silently discarded, and
    // every leaked pair kept deep-watching the variant state it was created
    // for. See #77.
    onBeforeUnmount(() => {
      renderStateSync?.stop()
      mountStateSync?.stop()
    })

    const mountVariant = computed(() => attrs.variant)

    if (renderContext?.mode !== 'render' && typeof props.initState === 'function' && mountVariant.value) {
      const state = await props.initState()
      applyState(mountVariant.value.state, toRawDeep(state))
    }

    if (renderContext?.mode !== 'render' && mountVariant.value && implicitState) {
      mountStateSync = syncStateBundledAndExternal(mountVariant.value.state, implicitState(), autoPropsStateKeys)
    }

    function updateVariant(variant: Variant) {
      Object.assign(variant, {
        slots: () => vm.slots,
        source: props.source,
        responsiveDisabled: props.responsiveDisabled,
        autoPropsDisabled: props.autoPropsDisabled,
        setupApp: props.setupApp,
        meta: props.meta,
        configReady: true,
      })

      const storyValue = story?.value
      if (storyValue && !props.implicit && !storyValue.meta?.hasVariantChildComponents) {
        if (!storyValue.meta) {
          storyValue.meta = {}
        }

        Object.assign(storyValue.meta, {
          hasVariantChildComponents: true,
        })
      }
    }

    function resolveVariant() {
      if (attrs.variant) {
        return attrs.variant
      }

      if (renderContext?.mode !== 'render') {
        return null
      }

      if (!renderVariant) {
        renderVariant = story?.value?.variants[renderContext.nextVariantIndex.value]
        renderContext.nextVariantIndex.value++
      }

      return renderVariant
    }

    function renderVariantSlot(variant: Variant, context: PreviewRenderContext) {
      if (context.slotName === 'controls') {
        return vm.slots['controls']?.({
          state: context.externalState,
        }) ?? null
      }

      if (context.slotName !== 'default') {
        return null
      }

      const vnodes = vm.slots['default']?.({
        state: context.externalState,
      }) ?? null

      if (vnodes && !variant.autoPropsDisabled) {
        lastPropsTypesSnapshot = syncVariantAutoProps(
          variant,
          vnodes,
          context.externalState,
          lastPropsTypesSnapshot,
        )
      }

      return vnodes
    }

    function syncRenderVariantState(variant: Variant) {
      if (!implicitState) {
        return
      }

      const shouldSync = renderContext?.mode === 'render'
        && renderContext.currentVariant?.id === variant.id

      if (shouldSync && !renderStateSync) {
        renderStateSync = syncStateBundledAndExternal(variant.state, implicitState(), autoPropsStateKeys)
      }
      else if (!shouldSync && renderStateSync) {
        renderStateSync.stop()
        renderStateSync = null
      }
    }

    if (mountVariant.value) {
      updateVariant(mountVariant.value)
    }

    return {
      renderContext,
      renderVariantSlot,
      resolveVariant,
      syncRenderVariantState,
      updateVariant,
    }
  },

  render() {
    const variant = this.resolveVariant()

    if (!variant) {
      return null
    }

    this.updateVariant(variant)
    this.syncRenderVariantState(variant)

    const renderContext = this.renderContext
    if (renderContext?.mode !== 'render') {
      return null
    }

    if (renderContext.currentVariant?.id !== variant.id) {
      return null
    }

    return this.renderVariantSlot(variant, renderContext)
  },
})
