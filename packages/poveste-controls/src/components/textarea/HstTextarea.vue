<script lang="ts">
export default {
  name: 'HstTextarea',
  inheritAttrs: false,
}
</script>

<script lang="ts" setup>
import { ref } from 'vue'
import HstWrapper from '../HstWrapper.vue'

defineProps<{
  title?: string
  modelValue?: string | null
}>()

const emit = defineEmits({
  'update:modelValue': (newValue: string) => true,
})

const input = ref<HTMLInputElement>()
</script>

<template>
  <HstWrapper
    :title="title"
    class="poveste-textarea ptw-cursor-text"
    :class="$attrs.class"
    :style="$attrs.style"
    @click="input.focus()"
  >
    <textarea
      ref="input"
      v-bind="{ ...$attrs, class: null, style: null }"
      :value="modelValue"
      class="ptw-text-inherit ptw-bg-transparent ptw-w-full ptw-outline-none ptw-px-2 ptw-py-1 -ptw-my-1 ptw-border ptw-border-solid ptw-border-black/25 dark:ptw-border-white/25 focus:ptw-border-primary-500 dark:focus:ptw-border-primary-500 ptw-rounded-sm ptw-box-border ptw-resize-y ptw-min-h-[26px]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>
