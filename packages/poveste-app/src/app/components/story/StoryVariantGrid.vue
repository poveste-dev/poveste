<script lang="ts" setup>
import { useResizeObserver } from '@vueuse/core'
import { computed, onMounted, ref, watch } from 'vue'
import { useStoryStore } from '../../stores/story'
import StoryVariantGridItem from './StoryVariantGridItem.vue'

const storyStore = useStoryStore()

const gridTemplateWidth = computed(() => {
  if (storyStore.currentStory.layout.type !== 'grid') {
    return
  }

  const layoutWidth = storyStore.currentStory.layout.width

  if (!layoutWidth) {
    return '200px'
  }

  if (typeof layoutWidth === 'number') {
    return `${layoutWidth}px`
  }

  return layoutWidth
})

const gap = 16

// Rows kept mounted on each side of the viewport, so a scroll does not expose a
// blank band before the next update lands.
const overscanRows = 2

// What to render before any item has reported a height. One row would be enough
// to measure with, but the row width is not known yet either.
const initialCount = 10

const maxItemHeight = ref(0)

const el = ref<HTMLDivElement>(null)
const scrollTop = ref(0)
const viewportHeight = ref(0)

const variants = computed(() => storyStore.currentStory.variants)

useResizeObserver(el, () => {
  updateWindow()
  updateSize()
})

function updateWindow() {
  if (!el.value) return
  scrollTop.value = el.value.scrollTop
  viewportHeight.value = el.value.clientHeight
}

// The reported width is ignored: `columnCount` is what CSS lays out, so it is
// the authority on how many items sit in a row.
function onItemResize(_w: number, h: number) {
  if (maxItemHeight.value < h) {
    maxItemHeight.value = h
    updateWindow()
  }
}

// Grid size

const gridEl = ref<HTMLDivElement>(null)
const gridColumnWidth = ref(1)
const viewWidth = ref(1)

function updateSize() {
  if (!el.value) return
  viewWidth.value = el.value.clientWidth

  if (!gridEl.value) return

  if (gridTemplateWidth.value.endsWith('%')) {
    gridColumnWidth.value = viewWidth.value * Number.parseInt(gridTemplateWidth.value) / 100 - gap
  }
  else {
    gridColumnWidth.value = Number.parseInt(gridTemplateWidth.value)
  }
}

onMounted(() => {
  updateSize()
  updateWindow()
})

useResizeObserver(gridEl, () => {
  updateSize()
})

const columnCount = computed(() => Math.max(1, Math.min(variants.value.length, Math.floor((viewWidth.value + gap) / (gridColumnWidth.value + gap)))))

// The window is derived from what is on screen — a start *and* an end — rather
// than from a high-water mark of everything scrolled past. `columnCount` is what
// CSS actually lays out, so the row maths uses it rather than a second count
// derived from the measured item width.
const rowHeight = computed(() => maxItemHeight.value + gap)
const measured = computed(() => maxItemHeight.value > 0)
const rowCount = computed(() => Math.ceil(variants.value.length / columnCount.value))

const startIndex = computed(() => {
  if (!measured.value) return 0
  const firstRow = Math.floor(scrollTop.value / rowHeight.value) - overscanRows
  return Math.max(0, firstRow) * columnCount.value
})

const endIndex = computed(() => {
  if (!measured.value) return Math.min(variants.value.length, initialCount)
  const lastRow = Math.ceil((scrollTop.value + viewportHeight.value) / rowHeight.value) + overscanRows
  return Math.min(variants.value.length, Math.max(lastRow, 1) * columnCount.value)
})

const visibleVariants = computed(() => variants.value.slice(startIndex.value, endIndex.value))

// The spacer holds the full scroll extent; the grid is translated into place
// inside it. Before anything is measured there is nothing to reserve, and a
// height derived from a zero row height would be `Infinitypx` — dropped by the
// browser, which is what left the grid with no scroll extent at all.
const totalHeight = computed(() => measured.value ? rowCount.value * rowHeight.value - gap : undefined)
const offsetY = computed(() => measured.value ? (startIndex.value / columnCount.value) * rowHeight.value : 0)

// Selecting a variant that is outside the window has to move the scroller,
// since the item it would otherwise scroll to is not mounted.
watch(() => storyStore.currentVariant, (variant) => {
  maxItemHeight.value = 0 // Reset max height
  updateWindow()

  if (!variant || !el.value || !measured.value) return
  const index = variants.value.indexOf(variant)
  if (index === -1) return

  const top = Math.floor(index / columnCount.value) * rowHeight.value
  if (top < scrollTop.value || top + rowHeight.value > scrollTop.value + viewportHeight.value) {
    el.value.scrollTop = top
    updateWindow()
  }
})
</script>

<template>
  <div class="poveste-story-variant-grid flex flex-col items-stretch h-full __poveste-pane-shadow-from-right">
    <div
      ref="el"
      class="overflow-y-auto flex flex-1"
      @scroll="updateWindow()"
    >
      <div class="flex w-0 flex-1 mx-4">
        <div
          class="m-auto"
          :style="{
            minHeight: totalHeight != null ? `${totalHeight}px` : undefined,
          }"
        >
          <div
            ref="gridEl"
            class="grid gap-4 my-4"
            :style="{
              gridTemplateColumns: `repeat(${columnCount}, ${gridColumnWidth}px)`,
              transform: offsetY ? `translateY(${offsetY}px)` : undefined,
            }"
          >
            <StoryVariantGridItem
              v-for="variant of visibleVariants"
              :key="variant.id"
              :variant="variant"
              :story="storyStore.currentStory"
              @resize="onItemResize"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
