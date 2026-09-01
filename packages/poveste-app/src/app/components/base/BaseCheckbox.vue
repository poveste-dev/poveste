<script lang="ts" setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits({
  'update:modelValue': (_newValue: boolean) => true,
})

function toggle() {
  emit('update:modelValue', !props.modelValue)
  animationEnabled.value = true
}

// SVG check

const path = ref<SVGPathElement>()
const dasharray = ref(0)
const progress = computed(() => props.modelValue ? 1 : 0)
const dashoffset = computed(() => (1 - progress.value) * dasharray.value)
const animationEnabled = ref(false)

watch(path, () => {
  dasharray.value = path.value.getTotalLength?.() ?? 21.21
})
</script>

<template>
  <div
    role="checkbox"
    tabindex="0"
    :aria-checked="modelValue"
    class="poveste-base-checkbox flex items-center gap-2 select-none px-4 py-3 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-700"
    @click="toggle()"
    @keydown.enter.prevent="toggle()"
    @keydown.space.prevent="toggle()"
  >
    <div class="text-white w-[16px] h-[16px] relative">
      <div
        class="border group-active:bg-gray-500/20 rounded-sm box-border absolute inset-0 transition-border duration-150 ease-out"
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

    <slot />
  </div>
</template>
