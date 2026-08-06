<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { useResizeObserver } from '@vueuse/core'
import { computed, h, onBeforeUnmount, reactive, ref } from 'vue'

// Container

const overflowButtonWidth = 32

const el = ref<HTMLDivElement>()

const availableWidth = ref(0)

useResizeObserver(el, (entries) => {
  const containerWidth = entries[0].contentRect.width
  availableWidth.value = containerWidth - overflowButtonWidth
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
  for (let i = 0; i < c.length; i++) {
    width += c[i].width
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
  setup(props, { slots }) {
    const el = ref<HTMLDivElement>()

    const state = reactive({ width: 0, index: props.index })

    useResizeObserver(el, (entries) => {
      const width = entries[0].contentRect.width
      if (!children.value.has(el.value)) {
        children.value.set(el.value, state)
      }
      state.width = width
    })

    onBeforeUnmount(() => {
      children.value.delete(el.value)
    })

    const visible = computed(() => visibleChildrenCount.value > state.index)

    return () => h('div', { ref: el, style: { visibility: visible.value ? 'visible' : 'hidden' } }, slots.default())
  },
}

/**
 * Wraps each child with a <ChildWrapper>
 */
function ChildrenRender(props, { slots }) {
  const [fragment] = slots.default()
  return fragment.children.map((vnode, index) => h(ChildWrapper, { index }, () => [vnode]))
}

/**
 * Only renders a part of a children list
 */
function ChildrenSlice(props, { slots }) {
  const [fragment] = slots.default()
  return fragment.children.slice(props.start, props.end)
}
</script>

<template>
  <div
    ref="el"
    class="poveste-base-overflow-menu ptw-flex ptw-overflow-hidden ptw-relative"
  >
    <ChildrenRender>
      <slot />
    </ChildrenRender>

    <VDropdown
      v-if="visibleChildrenCount < children.size"
    >
      <div
        role="button"
        class="ptw-cursor-pointer hover:ptw-bg-primary-50 dark:hover:ptw-bg-primary-900 ptw-w-8 ptw-h-full ptw-flex ptw-items-center ptw-justify-center ptw-absolute ptw-top-0 ptw-right-0"
      >
        <Icon
          icon="carbon:caret-down"
          class="ptw-w-4 ptw-h-4 ptw-opacity-50 group-hover:ptw-opacity-100"
        />
      </div>

      <template #popper>
        <div class="ptw-flex ptw-flex-col ptw-items-stretch">
          <ChildrenSlice
            :start="visibleChildrenCount"
          >
            <slot name="overflow" />
          </ChildrenSlice>
        </div>
      </template>
    </VDropdown>
  </div>
</template>
