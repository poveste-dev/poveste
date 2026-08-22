import type { Story } from '@poveste/shared'
import type { PropType, VNode } from 'vue'
import { omitInheritStoryProps } from '@poveste/shared'
import { cloneVNode, computed, defineComponent, getCurrentInstance, h, isRef, provide, reactive, useAttrs } from 'vue'
import { useRenderContext } from './render-context.js'
import Variant from './Variant'

export default defineComponent({

  name: 'Story',
  __povesteType: 'story',

  inheritAttrs: false,

  props: {
    initState: {
      type: Function as PropType<() => any | Promise<any>>,
      default: undefined,
    },

    meta: {
      type: Object as PropType<Story['meta']>,
      default: undefined,
    },
  },

  setup(props) {
    const vm = getCurrentInstance()

    const attrs = useAttrs() as {
      story: Story
    }

    const renderContext = useRenderContext()
    const story = computed(() => attrs.story)
    provide('story', story)

    const storyComponent: any = vm.parent
    const implicitState = reactive<Record<string, any>>({})

    Object.defineProperty(implicitState, '$data', {
      enumerable: true,
      configurable: true,
      get: () => storyComponent.data,
      set: (value) => {
        Object.assign(storyComponent.data, value)
      },
    })

    function addImplicitState(source: Record<string, any>, key: string) {
      const value = source[key]

      if (typeof value === 'function' || (value?.__file) || typeof value?.render === 'function' || typeof value?.setup === 'function') {
        return
      }

      Object.defineProperty(implicitState, key, {
        enumerable: true,
        configurable: true,
        get: () => {
          const currentValue = source[key]
          return isRef(currentValue) ? currentValue.value : currentValue
        },
        set: (newValue) => {
          const currentValue = source[key]

          if (isRef(currentValue)) {
            currentValue.value = newValue
          }
          else if (currentValue && typeof currentValue === 'object' && newValue && typeof newValue === 'object') {
            Object.assign(currentValue, newValue)
          }
          else {
            source[key] = newValue
          }
        },
      })
    }

    // From `<script setup>`'s `defineExpose`
    for (const key in storyComponent.exposed) {
      addImplicitState(storyComponent.exposed, key)
    }
    // We needs __VUE_PROD_DEVTOOLS__ flag set to `true` to enable `devtoolsRawSetupState`
    for (const key in storyComponent.devtoolsRawSetupState) {
      addImplicitState(storyComponent.devtoolsRawSetupState, key)
    }
    for (const key in storyComponent.data) {
      addImplicitState(storyComponent.data, key)
    }
    provide('implicitState', () => implicitState)

    function updateStory() {
      if (props.meta) {
        if (!attrs.story.meta) {
          attrs.story.meta = {}
        }

        Object.assign(attrs.story.meta, props.meta)
      }

      Object.assign(attrs.story, {
        slots: () => vm.proxy.$slots,
      })
    }

    return {
      renderContext,
      story,
      renderMountStory,
      renderPreviewStory,
      updateStory,
    }

    function renderMountStory() {
      let index = 0

      // A sandbox exists to serve one variant, but this pass used to mount a
      // Variant component per <Variant> — 1000 setups, state syncs and
      // auto-props walks per grid cell to render one button (#197). Skip the
      // rest; variants resolve positionally, so `index` still advances past
      // them. Stories whose variants live in child components are invisible to
      // this vnode walk, so they keep the full mount.
      const targetIndex = renderContext?.targetVariantId && !attrs.story.meta?.hasVariantChildComponents
        ? attrs.story.variants.findIndex(v => v.id === renderContext.targetVariantId)
        : -1

      const applyAttrs = (vnodes: VNode[]) => {
        const result: VNode[] = []

        for (const vnode of vnodes) {
          // @ts-expect-error custom option
          if (vnode.type?.__povesteType === 'variant') {
            const variant = attrs.story.variants[index]
            index++

            if (!variant) {
              continue
            }

            if (targetIndex !== -1 && index - 1 !== targetIndex) {
              continue
            }

            const nextProps: any = {
              variant,
            }

            if (!vnode.props?.initState && !vnode.props?.['init-state']) {
              nextProps.initState = props.initState
            }

            for (const attr in vm.proxy.$attrs) {
              if (typeof vnode.props?.[attr] === 'undefined') {
                nextProps[attr] = vm.proxy.$attrs[attr]
              }
            }

            for (const attr in attrs.story) {
              if (!omitInheritStoryProps.includes(attr) && typeof vnode.props?.[attr] === 'undefined') {
                nextProps[attr] = attrs.story[attr]
              }
            }

            result.push(cloneVNode(vnode, nextProps))
            continue
          }

          if (Array.isArray(vnode.children)) {
            vnode.children = applyAttrs(vnode.children as VNode[])
          }

          result.push(vnode)
        }

        return result
      }

      return applyAttrs(vm.proxy.$slots.default?.() ?? [])
    }

    function renderPreviewStory() {
      renderContext.nextVariantIndex.value = 0

      const slotProps = {
        state: renderContext.externalState,
      }

      const children = []

      if (renderContext.slotName === 'controls') {
        children.push(...(vm.proxy.$slots.controls?.(slotProps) ?? []))
      }

      if (renderContext.slotName === 'default' || attrs.story.meta?.hasVariantChildComponents) {
        children.push(...(vm.proxy.$slots.default?.(slotProps) ?? []))
      }

      // Same story as the mount pass above: every Variant component here runs
      // its full setup and then all but the current one render null (#197).
      // Keep only the current one, and seed the positional index so it still
      // resolves to the right variant data. Filtering only the default slot —
      // the controls slot carries controls, and stories with variants in child
      // components are invisible to a vnode walk.
      if (
        renderContext.slotName === 'default'
        && renderContext.currentVariant
        && !attrs.story.meta?.hasVariantChildComponents
      ) {
        const targetIndex = attrs.story.variants.findIndex(v => v.id === renderContext.currentVariant.id)
        if (targetIndex !== -1) {
          let seen = 0
          let kept = false
          const keepTargetVariant = (vnodes: VNode[]) => {
            const result: VNode[] = []
            for (const vnode of vnodes) {
              // @ts-expect-error custom option
              if (vnode?.type?.__povesteType === 'variant') {
                if (seen === targetIndex) {
                  result.push(vnode)
                  kept = true
                }
                seen++
                continue
              }
              if (Array.isArray(vnode?.children) && vnode.children.length) {
                vnode.children = keepTargetVariant(vnode.children as VNode[])
              }
              result.push(vnode)
            }
            return result
          }
          const filtered = keepTargetVariant(children)
          if (kept) {
            renderContext.nextVariantIndex.value = targetIndex
            return filtered
          }
        }
      }

      return children
    }
  },

  render() {
    this.updateStory()

    const [firstVariant] = this.story.variants

    if (firstVariant?.id === '_default') {
      return h(Variant, {
        variant: firstVariant,
        initState: this.initState,
        implicit: true,
        ...this.$attrs,
      }, this.$slots)
    }

    if (this.renderContext?.mode === 'render') {
      return this.renderPreviewStory()
    }

    return this.renderMountStory()
  },
})
