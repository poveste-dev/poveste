<script lang="ts" setup>
import type { ClientCommand } from '@poveste/shared'
import type { Component } from 'vue'
import { nextTick, onMounted, reactive, ref } from 'vue'
import { executeCommand, getCommandContext } from '../../util/commands.js'
import BaseButton from '../base/BaseButton.vue'
import BaseKeyboardShortcut from '../base/BaseKeyboardShortcut.vue'
import PromptSelect from './PromptSelect.vue'
import PromptText from './PromptText.vue'

const props = defineProps<{
  command: ClientCommand
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const promptTypes = {
  text: PromptText,
  select: PromptSelect,
}

const answers = reactive<Record<string, any>>({})

// Initial default values
for (const prompt of props.command.prompts ?? []) {
  let defaultValue
  if (typeof prompt.defaultValue === 'function') {
    defaultValue = prompt.defaultValue(answers)
  }
  else {
    defaultValue = prompt.defaultValue
  }
  answers[prompt.field] = defaultValue
}

function submit() {
  const params = props.command.getParams
    ? props.command.getParams({ ...getCommandContext(), answers })
    : answers
  executeCommand(props.command, params)
  emit('close')
}

// Autofocus

const promptComps = ref<any[]>([])

function focusPrompt(index: number) {
  nextTick(() => {
    promptComps.value[index]?.focus?.()
  })
}

onMounted(() => {
  focusPrompt(0)
})
</script>

<template>
  <form
    class="poveste-command-prompts flex flex-col"
    @submit.prevent="submit()"
    @keyup.escape="$emit('close')"
  >
    <div class="p-4 opacity-70">
      {{ command.label }}
    </div>

    <!--
      `promptTypes[prompt.type]` resolves to the component whose `prompt` prop
      is that member of the union, but nothing states the correlation and the
      checker cannot infer it. Splitting this into `v-if` branches per type is
      what makes it checkable; that is a refactor of untested UI, so it waits
      for coverage rather than riding along with the type gate (#441).
    -->
    <component
      :is="promptTypes[prompt.type] as Component"
      v-for="(prompt, index) of command.prompts"
      :key="prompt.field"
      ref="promptComps"
      v-model="answers[prompt.field]"
      :prompt="prompt"
      :answers="answers"
      :index="index"
      class="hover:bg-gray-500/10 focus-within:bg-gray-500/5"
      @next="focusPrompt(index + 1)"
    />

    <div class="flex justify-end gap-2 p-2">
      <BaseButton
        type="submit"
        class="px-4 py-2 flex items-start gap-2"
      >
        <BaseKeyboardShortcut
          shortcut="Enter"
        />
        <span>Submit</span>
      </BaseButton>
    </div>
  </form>
</template>
