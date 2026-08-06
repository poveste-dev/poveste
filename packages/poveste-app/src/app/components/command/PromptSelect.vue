<script lang="ts" setup>
import type { SelectPrompt, SelectPromptOption } from '@poveste/shared'
import { Icon } from '@iconify/vue'
import { computed, ref, watchEffect } from 'vue'
import { useSelection } from '../../util/select.js'
import BaseKeyboardShortcut from '../base/BaseKeyboardShortcut.vue'

const props = defineProps<{
  modelValue?: string
  prompt: SelectPrompt
  answers: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'next'): void
}>()

const model = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
    emit('next')
  },
})

const input = ref<HTMLInputElement>()

function focus() {
  input.value?.focus()
  input.value?.select()
}

defineExpose({
  focus,
})

const search = ref('')

const options = ref<SelectPromptOption[]>([])

let requestId = 0
watchEffect(async () => {
  if (typeof props.prompt.options === 'function') {
    const rId = ++requestId
    const result = await props.prompt.options(search.value, props.answers)
    if (rId === requestId) {
      options.value = result
    }
  }
  else {
    options.value = props.prompt.options
  }
})

const formattedOptions = computed(() => {
  return options.value.map((option) => {
    if (typeof option === 'string') {
      return {
        value: option,
        label: option,
      }
    }
    else {
      return option
    }
  })
})

// Keyboard navigation

const {
  selectedIndex,
  selectNext,
  selectPrevious,
} = useSelection(formattedOptions)

function selectIndex(index: number) {
  const result = formattedOptions.value[index].value
  if (result) {
    model.value = result
  }
}
</script>

<template>
  <div class="poveste-prompt-select ptw-relative ptw-group">
    <input
      v-model="model"
      :required="prompt.required"
      tabindex="-1"
      class="ptw-absolute ptw-inset-0 ptw-opacity-0 ptw-pointer-events-none"
    >
    <label class="ptw-flex ptw-flex-col ptw-gap-2 ptw-p-2">
      <span class="ptw-px-2 ptw-flex">
        <span>{{ prompt.label }}</span>
        <span
          v-if="prompt.required"
          class="ptw-opacity-70"
        >*</span>

        <span class="ptw-opacity-40 ptw-text-sm ptw-ml-auto ptw-invisible group-focus-within:ptw-visible">
          Press <BaseKeyboardShortcut shortcut="Space" /> to select
        </span>
      </span>
      <input
        ref="input"
        v-model="search"
        class="ptw-bg-transparent ptw-w-full ptw-p-2 ptw-border ptw-border-gray-500/50 focus:ptw-border-primary-500/50 ptw-rounded ptw-outline-none"
        @keydown.down.prevent="selectNext()"
        @keydown.up.prevent="selectPrevious()"
        @keydown.space.prevent="selectIndex(selectedIndex)"
      >
    </label>

    <div class="ptw-overflow-auto max-h-[300px] ptw-mb-2">
      <button
        v-for="(option, index) of formattedOptions"
        :key="option.value"
        type="button"
        tabindex="-1"
        :class="[
          model === option.value
            ? 'ptw-bg-primary-500/20'
            : index === selectedIndex
              ? 'ptw-bg-primary-500/10'
              : 'ptw-bg-transparent',
        ]"
        class="ptw-w-full ptw-text-left ptw-px-4 ptw-py-2 hover:ptw-bg-primary-500/10 ptw-flex ptw-items-center"
        @click="model = option.value"
      >
        <span class="ptw-flex-1">{{ option.label }}</span>

        <Icon
          v-if="model === option.value"
          icon="carbon:checkmark"
          class="ptw-w-4 ptw-h-4 ptw-text-primary-500"
        />
      </button>
    </div>
  </div>
</template>
