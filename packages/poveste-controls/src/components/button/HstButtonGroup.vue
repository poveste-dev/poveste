<script lang="ts">
export default {
  name: 'HstButtonGroup',
}
</script>

<script setup lang="ts">
import type { ComputedRef } from 'vue'
import type { HstControlOption } from '../../types'
import { computed } from 'vue'
import HstWrapper from '../HstWrapper.vue'
import HstButton from './HstButton.vue'

const props = defineProps<{
  title?: string
  modelValue?: string
  options: string[] | number[] | HstControlOption[] | Record<string, string | number>
}>()

const formattedOptions: ComputedRef<HstControlOption[]> = computed(() => {
  if (Array.isArray(props.options)) {
    return props.options.map((value: string | number | HstControlOption) => {
      if (typeof value === 'string' || typeof value === 'number') {
        return { value, label: String(value) }
      }
      else {
        return value
      }
    })
  }
  else {
    return Object.keys(props.options).map((value: string) => ({
      value,
      label: props.options[value],
    }))
  }
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function selectOption(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <HstWrapper
    tag="div"
    role="group"
    :title="title"
    class="poveste-button-group ptw-flex-nowrap ptw-items-center"
  >
    <div class="ptw-flex ptw-gap-px ptw-border ptw-border-solid ptw-border-black/25 dark:ptw-border-white/25 ptw-rounded-sm ptw-p-px">
      <HstButton
        v-for="{ label, value } of formattedOptions"
        :key="value"
        class="ptw-px-1 ptw-h-[22px] ptw-flex-1 !ptw-rounded-[3px]"
        :color="value === modelValue ? 'primary' : 'flat'"
        :rounded="false"
        @click="selectOption(value)"
      >
        {{ label }}
      </HstButton>
    </div>
    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>
