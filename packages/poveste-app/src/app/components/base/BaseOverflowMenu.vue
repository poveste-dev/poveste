<script lang="ts" setup>
import type { SetupContext, VNode } from 'vue'
import { Icon } from '@iconify/vue'
import { useResizeObserver } from '@vueuse/core'
import { computed, h, onBeforeUnmount, reactive, ref } from 'vue'
import BaseDropdown from './BaseDropdown.vue'

// Container

const overflowButtonWidth = 32

const el = ref<HTMLDivElement>()

const availableWidth = ref(0)

useResizeObserver(el, ([entry]) => {
  if (!entry) return
  availableWidth.value = entry.contentRect.width - overflowButtonWidth
})

// Children

interface ChildState {
  width: number
  index: number
}

const children = ref(new Map<HTMLElement, ChildState>())

const visibleChildrenCount = computed(() => {
  let width = 0
  const c = [...children.value.values()].sort((a, b) => a.index - b.index)
  for (const [i, child] of c.entries()) {
    width += child.width
    if (width > availableWidth.value) {
      return i
    }
  }
  return c.length
})

/**
 * Watches for the size of each child and automatically hide them
 */
const ChildWrapper = {
  name: 'ChildWrapper',
  props: ['index'],
  setup(props: { index: number }, { slots }: SetupContext) {
    const el = ref<HTMLDivElement>()

    const state = reactive({ width: 0, index: props.index })

    useResizeObserver(el, ([entry]) => {
      // The observer only fires for an element it is observing, so this is
      // never null here — but `children` is keyed by the element, and an
      // undefined key would silently make a second entry for the same child.
      const element = el.value
      if (!element || !entry) return
      const width = entry.contentRect.width
      if (!children.value.has(element)) {
        children.value.set(element, state)
      }
      state.width = width
    })

    onBeforeUnmount(() => {
      const element = el.value
      if (element) children.value.delete(element)
    })

    const visible = computed(() => visibleChildrenCount.value > state.index)

    return () => h('div', { ref: el, style: { visibility: visible.value ? 'visible' : 'hidden' } }, slots['default']?.())
  },
}

/**
 * Wraps each child with a <ChildWrapper>
 */
function ChildrenRender(_props: unknown, { slots }: SetupContext) {
  const children = slots['default']?.()[0]?.children
  return Array.isArray(children) ? children.map((vnode, index) => h(ChildWrapper, { index }, () => [vnode])) : []
}

/**
 * Only renders a part of a children list
 */
function ChildrenSlice(props: { start?: number, end?: number }, { slots }: SetupContext) {
  const children = slots['default']?.()[0]?.children
  return Array.isArray(children) ? children.slice(props.start, props.end) as VNode[] : []
}
</script>

<template>
  <div
    ref="el"
    class="poveste-base-overflow-menu flex overflow-hidden relative"
  >
    <ChildrenRender>
      <slot />
    </ChildrenRender>

    <BaseDropdown
      v-if="visibleChildrenCount < children.size"
    >
      <!-- A `<button>`, where this was a `role="button"` div with no `tabindex`:
      the popover writes `aria-expanded` onto whatever it is given, and axe
      rejects that on an element with no role it can name (#924). A keyboard
      reaches the hidden tabs now, which it could not before. -->
      <button
        aria-label="More"
        class="cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900 w-8 h-full flex items-center justify-center absolute top-0 right-0"
      >
        <Icon
          icon="carbon:caret-down"
          class="w-4 h-4 opacity-50 group-hover:opacity-100"
        />
      </button>

      <template #popper>
        <div class="flex flex-col items-stretch">
          <ChildrenSlice
            :start="visibleChildrenCount"
          >
            <slot name="overflow" />
          </ChildrenSlice>
        </div>
      </template>
    </BaseDropdown>
  </div>
</template>
