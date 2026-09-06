<script lang="ts" setup>
import { computed, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  orientation: {
    type: String,
    default: 'landscape',
    validator: (value: string) => ['landscape', 'portrait'].includes(value),
  },

  defaultSplit: {
    type: Number,
    default: 50,
  },

  split: {
    type: Number,
    default: undefined,
  },

  min: {
    type: Number,
    default: 20,
  },

  max: {
    type: Number,
    default: 80,
  },

  draggerOffset: {
    type: String,
    default: 'center',
    validator: (value: string) => ['before', 'center', 'after'].includes(value),
  },

  saveId: {
    type: String,
    default: null,
  },

  fixed: {
    type: Boolean,
    default: false,
  },

  showDivider: {
    type: Boolean,
    default: true,
  },

  /**
   * Whether the first pane exists at all.
   *
   * Dropping it here rather than at the call site keeps the other slot at one
   * position in the tree, so a layout that sometimes has nothing to put beside
   * its content does not remount that content when it gains or loses the pane
   * (#328). A `v-if` inside this component leaves a comment placeholder, so the
   * surviving pane keeps its index and Vue patches it rather than rebuilding it;
   * a `v-if` at the call site, choosing between a pane and a bare element, is
   * what does not.
   */
  showFirst: {
    type: Boolean,
    default: true,
  },

  /**
   * The same for the last pane — see `showFirst` (#596).
   *
   * At most one of the two is meant to be false. Both false renders an empty
   * box that still persists a split, which is a caller mistake rather than a
   * mode this component supports.
   */
  showLast: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits({
  'update:split': (_value: number) => true,
})

const SAVE_PREFIX = '__poveste'

const currentSplit = ref(props.defaultSplit)

watch(() => props.split, (value) => {
  if (value !== undefined) {
    currentSplit.value = value
  }
}, {
  immediate: true,
})

/*
 * The key follows `saveId`, which callers build from reactive state —
 * `story-main-${placement}` changes when the reader moves the options pane.
 * Reading it once at setup only looked right while a layout change happened to
 * remount this component; hiding a pane instead of replacing it removed that,
 * and a stale key writes one placement's split over the other's (#596).
 */
const storageKey = computed(() => props.saveId ? `${SAVE_PREFIX}-split-pane-${props.saveId}` : null)

watch(storageKey, (key) => {
  if (!key) {
    return
  }

  const savedValue = localStorage.getItem(key)
  let parsedValue
  if (savedValue != null) {
    try {
      parsedValue = JSON.parse(savedValue)
    }
    catch (e) {
      console.error(e)
    }
  }

  // A key with nothing behind it means this layout has never been sized, so it
  // starts from its own default rather than keeping the previous layout's.
  currentSplit.value = typeof parsedValue === 'number' ? parsedValue : props.defaultSplit
}, {
  immediate: true,
})

watch(currentSplit, (value) => {
  if (storageKey.value) {
    localStorage.setItem(storageKey.value, JSON.stringify(value))
  }
  if (value !== props.split) {
    emit('update:split', value)
  }
}, {
  immediate: true,
})

const boundSplit = computed(() => {
  if (currentSplit.value < props.min) {
    return props.min
  }
  else if (currentSplit.value > props.max) {
    return props.max
  }
  else {
    return currentSplit.value
  }
})

const axis = computed(() => props.orientation === 'landscape' ? 'width' : 'height')

/** Whether there are two panes to divide, drag between, or share the axis. */
const hasBothPanes = computed(() => props.showFirst && props.showLast)

// A sole pane takes the axis whichever half it is, and loses the `flex-none` /
// `flex-1` modifiers below that only mean something against a sibling — the
// `fixed` case included, where a pixel width would pin it beside dead space.
const leftStyle = computed(() => {
  if (!hasBothPanes.value) {
    return { [axis.value]: '100%' }
  }
  return { [axis.value]: props.fixed ? `${boundSplit.value}px` : `${boundSplit.value}%` }
})

const rightStyle = computed(() => {
  if (!hasBothPanes.value) {
    return { [axis.value]: '100%' }
  }
  return { [axis.value]: props.fixed ? null : `${100 - boundSplit.value}%` }
})

const dragging = ref(false)
let startPosition = 0
let startSplit = 0
const el = ref(null)

function dragStart(e) {
  dragging.value = true
  startPosition = props.orientation === 'landscape' ? e.pageX : e.pageY
  startSplit = boundSplit.value
  window.addEventListener('mousemove', dragMove)
  window.addEventListener('mouseup', dragEnd)
}

function dragMove(e) {
  if (dragging.value) {
    let position
    let totalSize
    if (props.orientation === 'landscape') {
      position = e.pageX
      totalSize = el.value.offsetWidth
    }
    else {
      position = e.pageY
      totalSize = el.value.offsetHeight
    }
    const dPosition = position - startPosition
    if (props.fixed) {
      currentSplit.value = startSplit + dPosition
    }
    else {
      currentSplit.value = startSplit + ~~(dPosition / totalSize * 200) / 2
    }
  }
}

function dragEnd() {
  dragging.value = false
  removeDragListeners()
}

// The dragger goes with the boundary, but the listeners are on `window` and
// this component now outlives the toggle that removed it — so a drag in flight
// would otherwise keep writing a split for a divider that is no longer there.
watch(hasBothPanes, (both) => {
  if (!both && dragging.value) {
    dragEnd()
  }
})

function removeDragListeners() {
  window.removeEventListener('mousemove', dragMove)
  window.removeEventListener('mouseup', dragEnd)
}

onUnmounted(() => {
  removeDragListeners()
})
</script>

<template>
  <div
    ref="el"
    class="poveste-base-split-pane flex h-full isolate overflow-auto"
    :class="{
      'flex-col': orientation === 'portrait',
      'cursor-ew-resize': dragging && orientation === 'landscape',
      'cursor-ns-resize': dragging && orientation === 'portrait',
      [orientation]: true,
    }"
  >
    <div
      v-if="showFirst"
      class="relative top-0 left-0 z-20"
      :class="{
        'pointer-events-none': dragging,
        'border-r border-gray-300/30 dark:border-gray-800': orientation === 'landscape' && showDivider && hasBothPanes,
        'flex-none': fixed && hasBothPanes,
      }"
      :style="leftStyle"
    >
      <slot name="first" />

      <div
        v-if="hasBothPanes"
        class="dragger absolute z-100 hover:bg-primary-500/50 transition-colors duration-150 delay-150"
        :class="{
          'top-0 bottom-0 cursor-ew-resize': orientation === 'landscape',
          'left-0 right-0 cursor-ns-resize': orientation === 'portrait',
          [`dragger-offset-${draggerOffset}`]: true,
          'bg-primary-500/25': dragging,
        }"
        @mousedown.prevent="dragStart"
      />
    </div>
    <div
      v-if="showLast"
      class="relative bottom-0 right-0"
      :class="{
        'pointer-events-none': dragging,
        'border-t border-gray-300/30 dark:border-gray-800': orientation === 'portrait' && showDivider && hasBothPanes,
        'flex-1': fixed && hasBothPanes,
      }"
      :style="rightStyle"
    >
      <slot name="last" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.landscape > div > .dragger {
  width: .625rem;
}

.portrait > div > .dragger {
  height: .625rem;
}

.landscape > div > .dragger.dragger-offset-before {
  right: 0;
}

.portrait > div > .dragger.dragger-offset-before {
  bottom: 0;
}

.landscape > div > .dragger.dragger-offset-center {
  right: -.3125rem;
}

.portrait > div > .dragger.dragger-offset-center {
  bottom: -.3125rem;
}

.landscape > div > .dragger.dragger-offset-after {
  right: -.625rem;
}

.portrait > div > .dragger.dragger-offset-after {
  bottom: -.625rem;
}
</style>
