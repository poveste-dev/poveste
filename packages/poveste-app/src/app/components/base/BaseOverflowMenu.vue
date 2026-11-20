<script lang="ts" setup>
import type { SetupContext, VNode } from 'vue'
import { Icon } from '@iconify/vue'
import { useResizeObserver } from '@vueuse/core'
import { computed, h, onBeforeUnmount, reactive, ref } from 'vue'
import { visibleChildren } from '../../util/overflow'
import BaseDropdown from './BaseDropdown.vue'

const props = defineProps<{
  /** The child that is showing, which stays in the row whatever the width. */
  active?: number | undefined
}>()

// Container

const overflowButtonWidth = 32

const el = ref<HTMLDivElement>()

const availableWidth = ref(0)

useResizeObserver(el, ([entry]) => {
  if (!entry) return
  availableWidth.value = entry.contentRect.width
})

// Children

interface ChildState {
  width: number
  index: number
}

const children = ref(new Map<HTMLElement, ChildState>())

const visibleIndices = computed(() => visibleChildren(
  [...children.value.values()].sort((a, b) => a.index - b.index).map(child => child.width),
  availableWidth.value,
  overflowButtonWidth,
  props.active,
))

const hiddenIndices = computed(() => {
  const visible = new Set(visibleIndices.value)
  return [...children.value.values()].map(child => child.index).filter(index => !visible.has(index)).sort((a, b) => a - b)
})

// Flex `order` rather than hiding in place: a child hidden ahead of the active one would
// otherwise keep its width in the row and push the active one under the button.
const childOrder = computed(() => new Map([...visibleIndices.value, ...hiddenIndices.value].map((index, position) => [index, position])))

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

    const visible = computed(() => visibleIndices.value.includes(state.index))

    return () => h('div', {
      ref: el,
      style: { visibility: visible.value ? 'visible' : 'hidden', order: childOrder.value.get(state.index) },
    }, slots['default']?.())
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
 * Only renders the children at the given indices
 */
function ChildrenPick(props: { indices: number[] }, { slots }: SetupContext) {
  const children = slots['default']?.()[0]?.children
  return Array.isArray(children) ? props.indices.map(index => children[index]).filter(Boolean) as VNode[] : []
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

    <!-- Positioned on the dropdown's anchor, not on the button inside it: the anchor
    otherwise sits in the row after every tab, past the window's edge, and the menu
    can only open clipped there (#1699). -->
    <BaseDropdown
      v-if="hiddenIndices.length"
      align="end"
      class="absolute top-0 right-0 h-full"
    >
      <!-- A `<button>`, where this was a `role="button"` div with no `tabindex`:
      the popover writes `aria-expanded` onto whatever it is given, and axe
      rejects that on an element with no role it can name (#924). A keyboard
      reaches the hidden tabs now, which it could not before. -->
      <button
        aria-label="More"
        class="cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900 w-8 h-full flex items-center justify-center"
      >
        <Icon
          icon="carbon:caret-down"
          class="w-4 h-4 opacity-50 group-hover:opacity-100"
        />
      </button>

      <template #popper>
        <div class="flex flex-col items-stretch">
          <ChildrenPick :indices="hiddenIndices">
            <slot name="overflow" />
          </ChildrenPick>
        </div>
      </template>
    </BaseDropdown>
  </div>
</template>
