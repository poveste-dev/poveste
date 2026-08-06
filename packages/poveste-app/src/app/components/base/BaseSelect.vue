<script lang="ts" setup>
import type { ComputedRef } from 'vue'
import { Icon } from '@iconify/vue'
import { Dropdown as VDropdown } from 'floating-vue'
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
  options: Record<string, string> | Array<string>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', value: string): void
}>()

const formattedOptions: ComputedRef<Record<string, string>> = computed(() => {
  if (Array.isArray(props.options)) {
    return Object.fromEntries(props.options.map(value => [value, value]))
  }
  return props.options
})

const selectedLabel = computed(() => formattedOptions.value[props.modelValue])

function selectValue(value: string, hide: () => void) {
  emit('update:modelValue', value)
  emit('select', value)
  hide()
}
</script>

<template>
  <VDropdown
    class="poveste-base-select"
    auto-size
    auto-boundary-max-size
  >
    <div
      class="ptw-cursor-pointer ptw-w-full ptw-outline-none ptw-px-2 ptw-h-[27px] -ptw-my-1 ptw-border ptw-border-solid ptw-border-black/25 dark:ptw-border-white/25 hover:ptw-border-primary-500 dark:hover:ptw-border-primary-500 ptw-rounded-sm ptw-flex ptw-gap-2 ptw-items-center ptw-leading-normal"
    >
      <div class="ptw-flex-1 ptw-truncate">
        <slot :label="selectedLabel">
          {{ selectedLabel }}
        </slot>
      </div>
      <Icon
        icon="carbon:chevron-sort"
        class="ptw-w-4 ptw-h-4 ptw-flex-none ptw-ml-auto"
      />
    </div>
    <template #popper="{ hide }">
      <div class="ptw-flex ptw-flex-col ptw-bg-gray-50 dark:ptw-bg-gray-700">
        <div
          v-for="(label, value) in formattedOptions"
          v-bind="{ ...$attrs, class: null, style: null }"
          :key="label"
          class="ptw-px-2 ptw-py-1 ptw-cursor-pointer hover:ptw-bg-primary-100 dark:hover:ptw-bg-primary-700"
          :class="{
            'ptw-bg-primary-200 dark:ptw-bg-primary-800': props.modelValue === value,
          }"
          @click="selectValue(value, hide)"
        >
          <slot
            name="option"
            :label="label"
            :value="value"
          >
            {{ label }}
          </slot>
        </div>
      </div>
    </template>
  </VDropdown>
</template>
