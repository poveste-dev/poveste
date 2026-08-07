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
    class="poveste-simple-checkbox group text-white w-[16px] h-[16px] relative"
    :class="{ 'cursor-pointer': withToggle }"
    @click="toggle"
  >
    <div
      class="border border-solid group-active:bg-gray-500/20 rounded-sm box-border absolute inset-0 transition-border duration-150 ease-out group-hover:border-primary-500 group-hover:dark:border-primary-500"
      :class="[
        modelValue
          ? 'border-primary-500 border-8'
          : 'border-black/25 dark:border-white/25 delay-150',
      ]"
    />
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      class="relative z-10"
    >
      <path
        ref="path"
        d="m 4 12 l 5 5 l 10 -10"
        fill="none"
        class="stroke-white stroke-2 duration-200 ease-in-out"
        :class="[
          animationEnabled ? 'transition-all' : 'transition-none',
          {
            'delay-150': modelValue,
          },
        ]"
        :stroke-dasharray="dasharray"
        :stroke-dashoffset="dashoffset"
      />
    </svg>
  </div>
</template>
