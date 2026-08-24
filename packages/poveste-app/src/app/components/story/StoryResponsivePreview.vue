<script lang="ts" setup>
import type { Ref } from 'vue'
import type { Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { useEventListener } from '@vueuse/core'
import { VTooltip as vTooltip } from 'floating-vue'
import { computed, onUnmounted, ref } from 'vue'
import { usePreviewSettingsStore } from '../../stores/preview-settings'
import CheckerboardPattern from '../misc/CheckerboardPattern.vue'
import HatchedPattern from '../misc/HatchedPattern.vue'

const props = withDefaults(defineProps<{
  variant: Variant
  /**
   * Whether this preview is one a reader can size. False in a grid, where the
   * cell is sized by the column and the story it renders (#257).
   */
  responsive?: boolean
}>(), {
  responsive: true,
})

const settings = usePreviewSettingsStore().currentSettings

// Resize

const resizing = ref(false)

const onUnmountedCleanupFns: (() => unknown)[] = []
onUnmounted(() => {
  onUnmountedCleanupFns.forEach(fn => fn())
})

function addWindowListener(event: string, listener: (event: any) => unknown) {
  window.addEventListener(event, listener)
  const removeListener = () => window.removeEventListener(event, listener)
  onUnmountedCleanupFns.push(removeListener)
  return () => {
    removeListener()
    onUnmountedCleanupFns.splice(onUnmountedCleanupFns.indexOf(removeListener), 1)
  }
}

function useDragger(el: Ref<HTMLDivElement>, value: Ref<number>, min: number, max: number, axis: 'x' | 'y') {
  function onMouseDown(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    const start = axis === 'x' ? event.clientX : event.clientY
    const startValue = value.value ?? (axis === 'x' ? previewWrapper.value.clientWidth - 67 : previewWrapper.value.clientHeight - 70)
    resizing.value = true

    const removeListeners = [
      addWindowListener('mousemove', onMouseMove),
      addWindowListener('mouseup', onMouseUp),
    ]

    function onMouseMove(event: MouseEvent) {
      const snapTarget = (axis === 'x' ? previewWrapper.value.clientWidth : previewWrapper.value.clientHeight)
      const delta = (axis === 'x' ? event.clientX : event.clientY) - start
      value.value = Math.max(min, Math.min(max, startValue + delta))

      if (Math.abs(value.value - (snapTarget - 67)) < 16) {
        value.value = null
      }
    }

    function onMouseUp() {
      removeListeners.forEach(fn => fn())
      resizing.value = false
    }
  }
  useEventListener(el, 'mousedown', onMouseDown)

  function onTouchStart(event: TouchEvent) {
    event.preventDefault()
    event.stopPropagation()
    const start = axis === 'x' ? event.touches[0].clientX : event.touches[0].clientY
    const startValue = value.value
    resizing.value = true

    const removeListeners = [
      addWindowListener('touchmove', onTouchMove),
      addWindowListener('touchend', onTouchEnd),
      addWindowListener('touchcancel', onTouchEnd),
    ]

    function onTouchMove(event: TouchEvent) {
      const delta = (axis === 'x' ? event.touches[0].clientX : event.touches[0].clientY) - start
      value.value = Math.max(min, Math.min(max, startValue + delta))
    }

    function onTouchEnd() {
      removeListeners.forEach(fn => fn())
      resizing.value = false
    }
  }
  useEventListener(el, 'touchstart', onTouchStart)
}

const responsiveWidth = computed({
  get: () => settings[settings.rotate ? 'responsiveHeight' : 'responsiveWidth'],
  set: (value) => { settings[settings.rotate ? 'responsiveHeight' : 'responsiveWidth'] = value },
})
const responsiveHeight = computed({
  get: () => settings[settings.rotate ? 'responsiveWidth' : 'responsiveHeight'],
  set: (value) => { settings[settings.rotate ? 'responsiveWidth' : 'responsiveHeight'] = value },
})

const horizontalDragger = ref<HTMLDivElement>()
const verticalDragger = ref<HTMLDivElement>()
const cornerDragger = ref<HTMLDivElement>()
const previewWrapper = ref<HTMLDivElement>()

useDragger(horizontalDragger, responsiveWidth, 32, 20000, 'x')
useDragger(verticalDragger, responsiveHeight, 32, 20000, 'y')
useDragger(cornerDragger, responsiveWidth, 32, 20000, 'x')
useDragger(cornerDragger, responsiveHeight, 32, 20000, 'y')

// Handle rotate

const finalWidth = computed(() => settings.rotate ? settings.responsiveHeight : settings.responsiveWidth)
const finalHeight = computed(() => settings.rotate ? settings.responsiveWidth : settings.responsiveHeight)

// Disabled responsive

const isResponsiveEnabled = computed(() => props.responsive && !props.variant.responsiveDisabled)

const sizeTooltip = computed(() => `${responsiveWidth.value ?? 'Auto'} × ${responsiveHeight.value ?? 'Auto'}`)
</script>

<template>
  <div class="poveste-story-responsive-preview w-full h-full flex-1 rounded-lg relative overflow-hidden">
    <div
      v-if="isResponsiveEnabled"
      class="absolute inset-0 w-full h-full bg-gray-100 dark:bg-gray-750 rounded-r-lg border-l-2 border-gray-500/10 dark:border-gray-700/30 overflow-hidden"
    >
      <HatchedPattern
        class="w-full h-full text-black/[1%] dark:text-white/[1%]"
      />
    </div>

    <div
      ref="previewWrapper"
      class="h-full overflow-auto relative"
    >
      <div
        class="rounded-lg relative"
        :class="[
          // The surface, the reader's background, the checkerboard and the
          // padding below are all skipped in a grid cell, where the item around
          // this preview already paints and pads them — rendering them again
          // stacked a second identical box inside the first and doubled the
          // padding (#264). Gated on `responsive`, not `isResponsiveEnabled`:
          // a single-view story with `responsiveDisabled` still needs its own
          // chrome, it just loses the draggers.
          responsive ? 'bg-white dark:bg-gray-700' : '',
          isResponsiveEnabled ? {
            'w-fit': !!finalWidth,
            'h-fit': !!finalHeight,
            'h-full': !finalHeight,
          } : 'h-full',
          // Sized to content, so nothing can overflow it and clipping keeps the
          // corners. Sized by its container, a taller story overflows — and
          // clipping there put the content past the fold out of reach entirely,
          // since the scroll parent then sees nothing to scroll (#258).
          isResponsiveEnabled && finalHeight ? 'overflow-hidden' : 'overflow-auto',
        ]"
      >
        <!-- `min-h-full`, not `h-full`: when this paints the reader's preview
             background the box above it scrolls, so a story taller than the
             preview would otherwise be shown against the bare box below the
             first screenful. The checkerboard is measured against this for the
             same reason — but the draggers are not, since they belong to the
             visible box rather than to the story's full height. -->
        <div
          class="rounded-lg min-h-full relative"
          :class="responsive ? 'bind-preview-bg' : ''"
          :data-testid="responsive ? 'responsive-preview-bg' : undefined"
        >
          <CheckerboardPattern
            v-if="settings.checkerboard && responsive"
            class="absolute inset-0 w-full h-full text-gray-500/20"
          />
          <div
            class="h-full relative"
            :class="responsive ? 'p-8' : ''"
          >
            <div class="w-full h-full relative">
              <div class="absolute inset-0" />

              <slot
                :is-responsive-enabled="isResponsiveEnabled"
                :final-width="finalWidth"
                :final-height="finalHeight"
                :resizing="resizing"
              />
            </div>

            <!-- Markers: the ruler ticks for the size the draggers set, so they
                 go wherever the draggers do (#257). -->
            <template v-if="isResponsiveEnabled">
              <div class="absolute top-5 left-8 h-2 w-px bg-gray-400/25" />
              <div class="absolute top-5 right-8 h-2 w-px bg-gray-400/25" />
              <div class="absolute bottom-5 left-8 h-2 w-px bg-gray-400/25" />
              <div class="absolute bottom-5 right-8 h-2 w-px bg-gray-400/25" />
              <div class="absolute left-5 top-8 w-2 h-px bg-gray-400/25" />
              <div class="absolute left-5 bottom-8 w-2 h-px bg-gray-400/25" />
              <div class="absolute right-5 top-8 w-2 h-px bg-gray-400/25" />
              <div class="absolute right-5 bottom-8 w-2 h-px bg-gray-400/25" />
            </template>
          </div>
        </div>

        <!-- Resize Dragger -->
        <template v-if="isResponsiveEnabled">
          <div
            ref="horizontalDragger"
            v-tooltip.right="sizeTooltip"
            class="absolute w-4 top-0 bottom-4 right-0 hover:bg-primary-500/30 flex items-center justify-center cursor-ew-resize group hover:text-primary-500"
          >
            <Icon
              icon="mdi:drag-vertical-variant"
              class="w-4 h-4 opacity-20 group-hover:opacity-90"
            />
          </div>
          <div
            ref="verticalDragger"
            v-tooltip.bottom="sizeTooltip"
            class="absolute h-4 left-0 right-4 bottom-0 hover:bg-primary-500/30 flex items-center justify-center cursor-ns-resize group hover:text-primary-500"
          >
            <Icon
              icon="mdi:drag-horizontal-variant"
              class="w-4 h-4 opacity-20 group-hover:opacity-90"
            />
          </div>
          <div
            ref="cornerDragger"
            v-tooltip.bottom="sizeTooltip"
            class="absolute w-4 h-4 right-0 bottom-0 hover:bg-primary-500/30 flex items-center justify-center cursor-nwse-resize group hover:text-primary-500"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bind-preview-bg {
  background-color: v-bind('settings.backgroundColor');
}
</style>
