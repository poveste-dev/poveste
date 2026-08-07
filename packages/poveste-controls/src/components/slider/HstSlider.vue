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
    class="poveste-slider items-center"
    :title="title"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <div class="relative w-full flex items-center">
      <div class="absolute inset-0 flex items-center">
        <div class="border border-black/25 dark:border-white/25 h-1 w-full rounded-full" />
      </div>
      <input
        ref="input"
        v-model.number="numberModel"
        class="range-input appearance-none border-0 bg-transparent cursor-pointer relative w-full m-0 text-gray-700"
        type="range"
        v-bind="{ ...$attrs, class: null, style: null, min, max }"
        @mouseover="showTooltip = true"
        @mouseleave="showTooltip = false"
      >
      <div
        v-if="showTooltip"
        v-tooltip="{ content: modelValue.toString(), shown: true, distance: 16, delay: 0 }"
        class="absolute"
        :style="tooltipStyle"
      />
    </div>
  </HstWrapper>
</template>

<style lang="pcss">
/* v4: @apply in a component <style> needs the theme referenced explicitly. */
@reference "../../style/main.css";

.range-input {
  &::-webkit-slider-thumb {
    @apply appearance-none h-3 w-3 bg-white dark:bg-gray-700 border border-solid border-black/25 dark:border-white/25 rounded-full;
  }

  &:hover::-webkit-slider-thumb {
    @apply bg-primary-500!  border-primary-500!;
  }
}

/* Separate rules for -moz-range-thumb to prevent a bug with Safari that causes it to ignore custom style */

.range-input {
  &::-moz-range-thumb {
    @apply appearance-none h-3 w-3 bg-white dark:bg-gray-700 border border-solid border-black/25 dark:border-white/25 rounded-full;
  }

  &:hover::-moz-range-thumb {
    @apply bg-primary-500!  border-primary-500!;
  }
}
</style>
