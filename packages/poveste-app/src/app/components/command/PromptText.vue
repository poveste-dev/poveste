<script lang="ts" setup>
import type { TextPrompt } from '@poveste/shared'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue?: string
  prompt: TextPrompt
  answers: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | undefined): void
}>()

// The input needs a string to bind to, so the getter fills in `''` — but an
// absent answer has to leave as absent. `''` is falsy and *not* nullish, so
// coercing on the way out would stop a command's `answers.x ?? fallback` from
// firing, which is the trap #440 was about one file over.
const model = computed<string | undefined>({
  get: () => props.modelValue ?? '',
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
