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

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

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
    class="poveste-radio ptw-cursor-text"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <div class="-ptw-my-1">
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
          class="!ptw-hidden"
          @change="selectOption(value)"
        >
        <label
          tabindex="0"
          :for="`${value}-radio_${title}`"
          class="ptw-cursor-pointer ptw-flex ptw-items-center ptw-relative ptw-py-1 ptw-group"
          @keydown.enter.prevent="selectOption(value)"
          @keydown.space.prevent="selectOption(value)"
        >
          <svg
            width="16"
            height="16"
            viewBox="-12 -12 24 24"
            class="ptw-relative ptw-z-10 ptw-border ptw-border-solid  ptw-text-inherit ptw-rounded-full ptw-box-border ptw-inset-0 ptw-transition-border ptw-duration-150 ptw-ease-out ptw-mr-2 group-hover:ptw-border-primary-500"
            :class="[
              modelValue === value
                ? 'ptw-border-primary-500'
                : 'ptw-border-black/25 dark:ptw-border-white/25',
            ]"
          >
            <circle
              r="7"
              class="ptw-will-change-transform"
              :class="[
                animationEnabled ? 'ptw-transition-all' : 'ptw-transition-none',
                {
                  'ptw-delay-150': modelValue === value,
                },
                modelValue === value
                  ? 'ptw-fill-primary-500'
                  : 'ptw-fill-transparent ptw-scale-0',
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
