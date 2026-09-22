<script lang="ts">
export default {
  name: 'CheckboxVisual',
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue?: boolean | undefined
}>()

const path = ref<SVGPathElement>()
const dasharray = ref(0)
const progress = computed(() => props.modelValue ? 1 : 0)
const dashoffset = computed(() => (1 - progress.value) * dasharray.value)

// Held back until the first change so the tick does not draw itself on mount.
const animationEnabled = ref(false)

watch(() => props.modelValue, () => {
  animationEnabled.value = true
})

watch(path, () => {
  dasharray.value = path.value?.getTotalLength?.() ?? 21.21
})
</script>

<template>
  <span
    class="poveste-checkbox-visual"
    data-slot="visual"
  >
    <span
      class="poveste-checkbox-visual-box"
      data-slot="visual-box"
    />
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      class="poveste-checkbox-visual-check"
      data-slot="visual-check"
    >
      <path
        ref="path"
        d="m 4 12 l 5 5 l 10 -10"
        fill="none"
        :class="animationEnabled ? 'poveste-checkbox-visual-animated' : undefined"
        :stroke-dasharray="dasharray"
        :stroke-dashoffset="dashoffset"
      />
    </svg>
  </span>
</template>
