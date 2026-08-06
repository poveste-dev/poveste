<script lang="ts">
export default {
  name: 'HstText',
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
    class="poveste-text ptw-cursor-text ptw-items-center"
    :class="$attrs.class"
    :style="$attrs.style"
    @click="input.focus()"
  >
    <input
      ref="input"
      v-bind="{ ...$attrs, class: null, style: null }"
      type="text"
      :value="modelValue"
      class="ptw-text-inherit ptw-bg-transparent ptw-w-full ptw-outline-none ptw-px-2 ptw-py-1 -ptw-my-1 ptw-border ptw-border-solid ptw-border-black/25 dark:ptw-border-white/25 focus:ptw-border-primary-500 dark:focus:ptw-border-primary-500 ptw-rounded-sm"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>
