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
  <div class="poveste-prompt-select relative group">
    <input
      v-model="model"
      :required="prompt.required"
      tabindex="-1"
      class="absolute inset-0 opacity-0 pointer-events-none"
    >
    <label class="flex flex-col gap-2 p-2">
      <span class="px-2 flex">
        <span>{{ prompt.label }}</span>
        <span
          v-if="prompt.required"
          class="opacity-70"
        >*</span>

        <span class="opacity-40 text-sm ml-auto invisible group-focus-within:visible">
          Press <BaseKeyboardShortcut shortcut="Space" /> to select
        </span>
      </span>
      <input
        ref="input"
        v-model="search"
        class="bg-transparent w-full p-2 border border-gray-500/50 focus:border-primary-500/50 rounded outline-none"
        @keydown.down.prevent="selectNext()"
        @keydown.up.prevent="selectPrevious()"
        @keydown.space.prevent="selectIndex(selectedIndex)"
      >
    </label>

    <div class="overflow-auto max-h-[300px] mb-2">
      <button
        v-for="(option, index) of formattedOptions"
        :key="option.value"
        type="button"
        tabindex="-1"
        :class="[
          model === option.value
            ? 'bg-primary-500/20'
            : index === selectedIndex
              ? 'bg-primary-500/10'
              : 'bg-transparent',
        ]"
        class="w-full text-left px-4 py-2 hover:bg-primary-500/10 flex items-center"
        @click="model = option.value"
      >
        <span class="flex-1">{{ option.label }}</span>

        <Icon
          v-if="model === option.value"
          icon="carbon:checkmark"
          class="w-4 h-4 text-primary-500"
        />
      </button>
    </div>
  </div>
</template>
