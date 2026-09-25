<script lang="ts" setup>
import { computed, onUnmounted, ref, useId, watch } from 'vue'

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
   * What the divider is called to a screen reader.
   *
   * Four are on screen at once and they resize different things, so a shared
   * default would announce four identical separators.
   */
  label: {
    type: String,
    default: 'Resize panels',
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
  return { [axis.value]: props.fixed ? undefined : `${100 - boundSplit.value}%` }
})

const dragging = ref(false)
let startPosition = 0
let startSplit = 0
const el = ref<HTMLElement>()

function dragStart(e: MouseEvent) {
  dragging.value = true
  startPosition = props.orientation === 'landscape' ? e.pageX : e.pageY
  startSplit = boundSplit.value
  window.addEventListener('mousemove', dragMove)
  window.addEventListener('mouseup', dragEnd)
}

function dragMove(e: MouseEvent) {
  if (dragging.value) {
    // The move listener is on `window`, so it can outlive the element for the
    // rest of a drag if the pane unmounts under it.
    const pane = el.value
    if (!pane) return

    let position
    let totalSize
    if (props.orientation === 'landscape') {
      position = e.pageX
      totalSize = pane.offsetWidth
    }
    else {
      position = e.pageY
      totalSize = pane.offsetHeight
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

/*
 * The keyboard half, which the divider had none of: it was a `div` with a
 * `mousedown` handler, so the layout could only be changed with a pointer and a
 * screen reader was told nothing was there (#995).
 *
 * The arrow step is one unit of whatever `split` is measured in — percent
 * normally, pixels under `fixed` — and `PageUp`/`PageDown` move by ten, because
 * one pixel per press is not a usable way to move a pixel-sized pane.
 */
const STEP = 1
const PAGE_STEP = 10

function moveBy(amount: number) {
  currentSplit.value = Math.min(props.max, Math.max(props.min, boundSplit.value + amount))
}

function onKeydown(event: KeyboardEvent) {
  const back = props.orientation === 'landscape' ? 'ArrowLeft' : 'ArrowUp'
  const forward = props.orientation === 'landscape' ? 'ArrowRight' : 'ArrowDown'

  switch (event.key) {
    case back:
      moveBy(-STEP)
      break
    case forward:
      moveBy(STEP)
      break
    case 'PageUp':
      moveBy(-PAGE_STEP)
      break
    case 'PageDown':
      moveBy(PAGE_STEP)
      break
    case 'Home':
      currentSplit.value = props.min
      break
    case 'End':
      currentSplit.value = props.max
      break
    default:
      return
  }

  // Only for a key this handles: the arrows scroll the pane otherwise, and a
  // blanket `prevent` would stop that everywhere the divider has focus.
  event.preventDefault()
}

const firstPaneId = useId()

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
      :id="firstPaneId"
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
        role="separator"
        tabindex="0"
        :aria-label="label"
        :aria-orientation="orientation === 'landscape' ? 'vertical' : 'horizontal'"
        :aria-controls="firstPaneId"
        :aria-valuenow="Math.round(boundSplit)"
        :aria-valuemin="min"
        :aria-valuemax="max"
        class="dragger absolute z-100 hover:bg-primary-500/50 focus-visible:bg-primary-500/50 focus-visible:outline-2 focus-visible:outline-primary-500 transition-colors duration-150 delay-150"
        :class="{
          'top-0 bottom-0 cursor-ew-resize': orientation === 'landscape',
          'left-0 right-0 cursor-ns-resize': orientation === 'portrait',
          [`dragger-offset-${draggerOffset}`]: true,
          'bg-primary-500/25': dragging,
        }"
        @mousedown.prevent="dragStart"
        @keydown="onKeydown"
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
