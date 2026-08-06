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

const props = defineProps<{
  variant: Variant
}>()

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

const isResponsiveEnabled = computed(() => !props.variant.responsiveDisabled)

const sizeTooltip = computed(() => `${responsiveWidth.value ?? 'Auto'} × ${responsiveHeight.value ?? 'Auto'}`)
</script>

<template>
  <div class="poveste-story-responsive-preview ptw-w-full ptw-h-full ptw-flex-1 ptw-rounded-lg ptw-relative ptw-overflow-hidden">
    <div
      v-if="isResponsiveEnabled"
      class="ptw-absolute ptw-inset-0 ptw-w-full ptw-h-full ptw-bg-gray-100 dark:ptw-bg-gray-750 ptw-rounded-r-lg ptw-border-l-2 ptw-border-gray-500/10 dark:ptw-border-gray-700/30 ptw-overflow-hidden"
    >
      <HatchedPattern
        class="ptw-w-full ptw-h-full ptw-text-black/[1%] dark:ptw-text-white/[1%]"
      />
    </div>

    <div
      ref="previewWrapper"
      class="ptw-h-full ptw-overflow-auto ptw-relative"
    >
      <div
        class="ptw-overflow-hidden ptw-bg-white dark:ptw-bg-gray-700 ptw-rounded-lg ptw-relative"
        :class="isResponsiveEnabled ? {
          'ptw-w-fit': !!finalWidth,
          'ptw-h-fit': !!finalHeight,
          'ptw-h-full': !finalHeight,
        } : 'ptw-h-full'"
      >
        <div
          class="bind-preview-bg ptw-rounded-lg ptw-h-full"
          data-test-id="responsive-preview-bg"
        >
          <CheckerboardPattern
            v-if="settings.checkerboard"
            class="ptw-absolute ptw-inset-0 ptw-w-full ptw-h-full ptw-text-gray-500/20"
          />
          <div class="ptw-p-8 ptw-h-full ptw-relative">
            <div class="ptw-w-full ptw-h-full ptw-relative">
              <div class="ptw-absolute ptw-inset-0" />

              <slot
                :is-responsive-enabled="isResponsiveEnabled"
                :final-width="finalWidth"
                :final-height="finalHeight"
                :resizing="resizing"
              />
            </div>

            <!-- Markers -->
            <div class="ptw-absolute ptw-top-5 ptw-left-8 ptw-h-2 ptw-w-px ptw-bg-gray-400/25" />
            <div class="ptw-absolute ptw-top-5 ptw-right-8 ptw-h-2 ptw-w-px ptw-bg-gray-400/25" />
            <div class="ptw-absolute ptw-bottom-5 ptw-left-8 ptw-h-2 ptw-w-px ptw-bg-gray-400/25" />
            <div class="ptw-absolute ptw-bottom-5 ptw-right-8 ptw-h-2 ptw-w-px ptw-bg-gray-400/25" />
            <div class="ptw-absolute ptw-left-5 ptw-top-8 ptw-w-2 ptw-h-px ptw-bg-gray-400/25" />
            <div class="ptw-absolute ptw-left-5 ptw-bottom-8 ptw-w-2 ptw-h-px ptw-bg-gray-400/25" />
            <div class="ptw-absolute ptw-right-5 ptw-top-8 ptw-w-2 ptw-h-px ptw-bg-gray-400/25" />
            <div class="ptw-absolute ptw-right-5 ptw-bottom-8 ptw-w-2 ptw-h-px ptw-bg-gray-400/25" />
          </div>

          <!-- Resize Dragger -->
          <template v-if="isResponsiveEnabled">
            <div
              ref="horizontalDragger"
              v-tooltip.right="sizeTooltip"
              class="ptw-absolute ptw-w-4 ptw-top-0 ptw-bottom-4 ptw-right-0 hover:ptw-bg-primary-500/30 ptw-flex ptw-items-center ptw-justify-center ptw-cursor-ew-resize ptw-group hover:ptw-text-primary-500"
            >
              <Icon
                icon="mdi:drag-vertical-variant"
                class="ptw-w-4 ptw-h-4 ptw-opacity-20 group-hover:ptw-opacity-90"
              />
            </div>
            <div
              ref="verticalDragger"
              v-tooltip.bottom="sizeTooltip"
              class="ptw-absolute ptw-h-4 ptw-left-0 ptw-right-4 ptw-bottom-0 hover:ptw-bg-primary-500/30 ptw-flex ptw-items-center ptw-justify-center ptw-cursor-ns-resize ptw-group hover:ptw-text-primary-500"
            >
              <Icon
                icon="mdi:drag-horizontal-variant"
                class="ptw-w-4 ptw-h-4 ptw-opacity-20 group-hover:ptw-opacity-90"
              />
            </div>
            <div
              ref="cornerDragger"
              v-tooltip.bottom="sizeTooltip"
              class="ptw-absolute ptw-w-4 ptw-h-4 ptw-right-0 ptw-bottom-0 hover:ptw-bg-primary-500/30 ptw-flex ptw-items-center ptw-justify-center ptw-cursor-nwse-resize ptw-group hover:ptw-text-primary-500"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bind-preview-bg {
  background-color: v-bind('settings.backgroundColor');
}
</style>
