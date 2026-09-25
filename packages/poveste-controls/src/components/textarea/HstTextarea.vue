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

const input = ref<HTMLTextAreaElement>()
</script>

<template>
  <HstWrapper
    :title="title"
    class="poveste-textarea"
    :class="$attrs.class"
    :style="$attrs.style"
    @click="input?.focus()"
  >
    <textarea
      ref="input"
      v-bind="{ ...$attrs, class: null, style: null }"
      class="poveste-textarea-input"
      data-slot="control"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>

<style lang="postcss">
.poveste-textarea {
  cursor: text;
}

.poveste-textarea-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 26px;
  padding: .25rem .5rem;
  margin-block: -.25rem;
  border: 1px solid rgb(0 0 0 / .25);
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  outline: none;
  resize: vertical;

  &:where(.ptw-dark, .ptw-dark *) {
    border-color: rgb(255 255 255 / .25);
  }

  &:focus {
    border-color: var(--color-primary-500);
  }
}
</style>
