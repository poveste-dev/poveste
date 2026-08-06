<script lang="ts">
export default {
  name: 'HstSimpleCheckbox',
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue?: boolean
  withToggle?: boolean
}>()

const emit = defineEmits({
  'update:modelValue': (newValue: boolean) => true,
})

function toggle() {
  if (!props.withToggle) {
    return
  }

  emit('update:modelValue', !props.modelValue)
}

watch(() => props.modelValue, () => {
  animationEnabled.value = true
})

// SVG check

const path = ref<SVGPathElement>()
const dasharray = ref(0)
const progress = computed(() => props.modelValue ? 1 : 0)
const dashoffset = computed(() => (1 - progress.value) * dasharray.value)

// animationEnabled prevents the animation from triggering on mounted
const animationEnabled = ref(false)

watch(path, () => {
  dasharray.value = path.value.getTotalLength?.() ?? 21.21
})
</script>

<template>
  <div
    class="poveste-simple-checkbox ptw-group ptw-text-white ptw-w-[16px] ptw-h-[16px] ptw-relative"
    :class="{ 'ptw-cursor-pointer': withToggle }"
    @click="toggle"
  >
    <div
      class="ptw-border ptw-border-solid group-active:ptw-bg-gray-500/20 ptw-rounded-sm ptw-box-border ptw-absolute ptw-inset-0 ptw-transition-border ptw-duration-150 ptw-ease-out group-hover:ptw-border-primary-500 group-hover:dark:ptw-border-primary-500"
      :class="[
        modelValue
          ? 'ptw-border-primary-500 ptw-border-8'
          : 'ptw-border-black/25 dark:ptw-border-white/25 ptw-delay-150',
      ]"
    />
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      class="ptw-relative ptw-z-10"
    >
      <path
        ref="path"
        d="m 4 12 l 5 5 l 10 -10"
        fill="none"
        class="ptw-stroke-white ptw-stroke-2 ptw-duration-200 ptw-ease-in-out"
        :class="[
          animationEnabled ? 'ptw-transition-all' : 'ptw-transition-none',
          {
            'ptw-delay-150': modelValue,
          },
        ]"
        :stroke-dasharray="dasharray"
        :stroke-dashoffset="dashoffset"
      />
    </svg>
  </div>
</template>
