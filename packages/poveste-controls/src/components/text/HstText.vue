<script lang="ts">
export default {
  name: 'HstText',
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
    class="poveste-text"
    :class="$attrs.class"
    :style="$attrs.style"
    @click="input?.focus()"
  >
    <input
      ref="input"
      v-bind="{ ...$attrs, class: null, style: null }"
      type="text"
      class="poveste-text-input"
      data-slot="control"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>

<style lang="postcss">
.poveste-text {
  align-items: center;
  cursor: text;
}

.poveste-text-input {
  box-sizing: border-box;
  width: 100%;
  padding: .25rem .5rem;
  margin-block: -.25rem;
  border: 1px solid rgb(0 0 0 / .25);
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  outline: none;

  /* Spelled out on the subject: `.ptw-dark` sits above the `@scope` root, so a
     descendant rule keyed on it never matches from in here (#101). */
  &:where(.ptw-dark, .ptw-dark *) {
    border-color: rgb(255 255 255 / .25);
  }

  &:focus {
    border-color: var(--color-primary-500);
  }
}
</style>
