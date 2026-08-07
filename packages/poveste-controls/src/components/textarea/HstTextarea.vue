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
    class="poveste-textarea cursor-text"
    :class="$attrs.class"
    :style="$attrs.style"
    @click="input.focus()"
  >
    <textarea
      ref="input"
      v-bind="{ ...$attrs, class: null, style: null }"
      :value="modelValue"
      class="text-inherit bg-transparent w-full outline-none px-2 py-1 -my-1 border border-solid border-black/25 dark:border-white/25 focus:border-primary-500 dark:focus:border-primary-500 rounded-sm box-border resize-y min-h-[26px]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>
