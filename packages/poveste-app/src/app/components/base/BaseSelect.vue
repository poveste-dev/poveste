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
      class="cursor-pointer w-full outline-none px-2 h-[27px] -my-1 border border-solid border-black/25 dark:border-white/25 hover:border-primary-500 dark:hover:border-primary-500 rounded-sm flex gap-2 items-center leading-normal"
    >
      <div class="flex-1 truncate">
        <slot :label="selectedLabel">
          {{ selectedLabel }}
        </slot>
      </div>
      <Icon
        icon="carbon:chevron-sort"
        class="w-4 h-4 flex-none ml-auto"
      />
    </div>
    <template #popper="{ hide }">
      <div class="flex flex-col bg-gray-50 dark:bg-gray-700">
        <div
          v-for="(label, value) in formattedOptions"
          v-bind="{ ...$attrs, class: null, style: null }"
          :key="label"
          class="px-2 py-1 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-700"
          :class="{
            'bg-primary-200 dark:bg-primary-800': props.modelValue === value,
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
