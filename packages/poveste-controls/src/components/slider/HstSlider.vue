<script lang="ts">
export default {
  name: 'HstSlider',
  inheritAttrs: false,
}
</script>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import { VTooltip as vTooltip } from 'floating-vue'
import { computed, ref } from 'vue'
import HstWrapper from '../HstWrapper.vue'

const props = defineProps<{
  title?: string
  modelValue?: number | null
  min: number
  max: number
}>()

const emit = defineEmits({
  'update:modelValue': (newValue: number) => true,
})

const showTooltip = ref(false)
const input = ref<HTMLInputElement>(null)

const numberModel = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})

const percentage = computed(() => {
  return (props.modelValue - props.min) / (props.max - props.min)
})

const tooltipStyle = computed<CSSProperties>(() => {
  const gap = 8
  if (input.value) {
    const position = gap + ((input.value.clientWidth - 2 * gap) * percentage.value)
    return {
      left: `${position}px`,
    }
  }
  return {}
})
</script>

<template>
  <HstWrapper
    class="poveste-slider ptw-items-center"
    :title="title"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <div class="ptw-relative ptw-w-full ptw-flex ptw-items-center">
      <div class="ptw-absolute ptw-inset-0 ptw-flex ptw-items-center">
        <div class="ptw-border ptw-border-black/25 dark:ptw-border-white/25 ptw-h-1 ptw-w-full ptw-rounded-full" />
      </div>
      <input
        ref="input"
        v-model.number="numberModel"
        class="ptw-range-input ptw-appearance-none ptw-border-0 ptw-bg-transparent ptw-cursor-pointer ptw-relative ptw-w-full ptw-m-0 ptw-text-gray-700"
        type="range"
        v-bind="{ ...$attrs, class: null, style: null, min, max }"
        @mouseover="showTooltip = true"
        @mouseleave="showTooltip = false"
      >
      <div
        v-if="showTooltip"
        v-tooltip="{ content: modelValue.toString(), shown: true, distance: 16, delay: 0 }"
        class="ptw-absolute"
        :style="tooltipStyle"
      />
    </div>
  </HstWrapper>
</template>

<style lang="pcss">
.ptw-range-input {
  &::-webkit-slider-thumb {
    @apply ptw-appearance-none ptw-h-3 ptw-w-3 ptw-bg-white dark:ptw-bg-gray-700 ptw-border ptw-border-solid ptw-border-black/25 dark:ptw-border-white/25 ptw-rounded-full;
  }

  &:hover::-webkit-slider-thumb {
    @apply !ptw-bg-primary-500  !ptw-border-primary-500;
  }
}

/* Separate rules for -moz-range-thumb to prevent a bug with Safari that causes it to ignore custom style */

.ptw-range-input {
  &::-moz-range-thumb {
    @apply ptw-appearance-none ptw-h-3 ptw-w-3 ptw-bg-white dark:ptw-bg-gray-700 ptw-border ptw-border-solid ptw-border-black/25 dark:ptw-border-white/25 ptw-rounded-full;
  }

  &:hover::-moz-range-thumb {
    @apply !ptw-bg-primary-500  !ptw-border-primary-500;
  }
}
</style>
