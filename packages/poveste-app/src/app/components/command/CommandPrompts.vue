<script lang="ts" setup>
import type { ClientCommand } from '@poveste/shared'
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
for (const prompt of props.command.prompts) {
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
    class="poveste-command-prompts ptw-flex ptw-flex-col"
    @submit.prevent="submit()"
    @keyup.escape="$emit('close')"
  >
    <div class="ptw-p-4 ptw-opacity-70">
      {{ command.label }}
    </div>

    <component
      :is="promptTypes[prompt.type]"
      v-for="(prompt, index) of command.prompts"
      :key="prompt.field"
      ref="promptComps"
      v-model="answers[prompt.field]"
      :prompt="prompt"
      :answers="answers"
      :index="index"
      class="hover:ptw-bg-gray-500/10 focus-within:ptw-bg-gray-500/5"
      @next="focusPrompt(index + 1)"
    />

    <div class="ptw-flex ptw-justify-end ptw-gap-2 ptw-p-2">
      <BaseButton
        type="submit"
        class="ptw-px-4 ptw-py-2 ptw-flex ptw-items-start ptw-gap-2"
      >
        <BaseKeyboardShortcut
          shortcut="Enter"
        />
        <span>Submit</span>
      </BaseButton>
    </div>
  </form>
</template>
