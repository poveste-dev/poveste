<script lang="ts">
export default {
  name: 'HstRadio',
}
</script>

<script lang="ts" setup>
import type { ComputedRef } from 'vue'
import type { HstControlOption } from '../../types'
import { computed, ref } from 'vue'
import HstWrapper from '../HstWrapper.vue'

const props = defineProps<{
  title?: string
  modelValue?: string | null
  options: HstControlOption[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const formattedOptions: ComputedRef<Record<string, string>> = computed(() => {
  if (Array.isArray(props.options)) {
    return Object.fromEntries(props.options.map((value: string | HstControlOption) => {
      if (typeof value === 'string') {
        return [value, value]
      }
      else {
        return [value.value, value.label]
      }
    }))
  }
  return props.options
})

function selectOption(value: string) {
  emit('update:modelValue', value)
  animationEnabled.value = true
}

// animationEnabled prevents the animation from triggering on mounted
const animationEnabled = ref(false)
</script>

<template>
  <HstWrapper
    role="group"
    :title="title"
    class="poveste-radio cursor-text"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <div class="-my-1">
      <template
        v-for="(label, value) in formattedOptions"
        :key="value"
      >
        <input
          :id="`${value}-radio_${title}`"
          type="radio"
          :name="`${value}-radio_${title}`"
          :value="value"
          :checked="value === modelValue"
          class="hidden!"
          @change="selectOption(value)"
        >
        <label
          tabindex="0"
          :for="`${value}-radio_${title}`"
          class="cursor-pointer flex items-center relative py-1 group"
          @keydown.enter.prevent="selectOption(value)"
          @keydown.space.prevent="selectOption(value)"
        >
          <svg
            width="16"
            height="16"
            viewBox="-12 -12 24 24"
            class="relative z-10 border border-solid  text-inherit rounded-full box-border inset-0 transition-border duration-150 ease-out mr-2 group-hover:border-primary-500"
            :class="[
              modelValue === value
                ? 'border-primary-500'
                : 'border-black/25 dark:border-white/25',
            ]"
          >
            <circle
              r="7"
              class="will-change-transform"
              :class="[
                animationEnabled ? 'transition-all' : 'transition-none',
                {
                  'delay-150': modelValue === value,
                },
                modelValue === value
                  ? 'fill-primary-500'
                  : 'fill-transparent scale-0',
              ]"
            />
          </svg>
          {{ label }}
        </label>
      </template>
    </div>

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>
