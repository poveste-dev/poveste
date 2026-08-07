<script lang="ts" setup>
import type { TextPrompt } from '@poveste/shared'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue?: string
  prompt: TextPrompt
  answers: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const input = ref<HTMLInputElement>()

function focus() {
  input.value?.focus()
  input.value?.select()
}

defineExpose({
  focus,
})

// Default value

const defaultValue = computed(() => {
  if (typeof props.prompt.defaultValue === 'function') {
    return props.prompt.defaultValue(props.answers)
  }
  else {
    return props.prompt.defaultValue
  }
})

watch(defaultValue, (value) => {
  model.value = value
})
</script>

<template>
  <div class="poveste-prompt-text">
    <label class="flex flex-col gap-2 p-2">
      <span class="px-2">
        <span>{{ prompt.label }}</span>
        <span
          v-if="prompt.required"
          class="opacity-70"
        >*</span>
      </span>
      <input
        ref="input"
        v-model="model"
        class="bg-transparent w-full p-2 border border-gray-500/50 focus:border-primary-500/50 rounded outline-none"
        :required="prompt.required"
      >
    </label>
  </div>
</template>
