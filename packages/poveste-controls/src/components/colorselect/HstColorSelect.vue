<script lang="ts">
export default {
  name: 'HstColorSelect',
  inheritAttrs: false,
}
</script>

<script lang="ts" setup>
import { computed } from 'vue'
import HstWrapper from '../HstWrapper.vue'

const props = defineProps<{
  title?: string
  modelValue?: string | null
}>()

const emit = defineEmits({
  'update:modelValue': (newValue: string) => true,
})

const stringModel = computed({
  get: () => props.modelValue,
  set: value => {
    emit('update:modelValue', value)
  },
})

function throttle(cb, delay = 15) {
  let shouldWait = false
  let waitingArgs
  const timeoutFunc = () => {
    if (waitingArgs == null) {
      shouldWait = false
    } else {
      cb(...waitingArgs)
      waitingArgs = null
      setTimeout(timeoutFunc, delay)
    }
  }

  return (...args) => {
    if (shouldWait) {
      waitingArgs = args
      return
    }

    cb(...args)
    shouldWait = true
    setTimeout(timeoutFunc, delay)
  }
}
const updateValue = throttle((value: string) => {
  emit('update:modelValue', value)
})
function processChange(inp) {
  updateValue(inp)
}
</script>

<script>

</script>

<template>
  <HstWrapper
    :title="title"
    class="poveste-select ptw-cursor-text ptw-items-center"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <div class="ptw-flex ptw-flex-row ptw-gap-1">
      <input
        v-bind="{ ...$attrs, class: null, style: null }"
        v-model="stringModel"
        type="text"
        class="ptw-text-inherit ptw-bg-transparent ptw-w-full ptw-outline-none ptw-px-2 ptw-py-1 -ptw-my-1 ptw-border ptw-border-solid ptw-border-black/25 dark:ptw-border-white/25 focus:ptw-border-primary-500 dark:focus:ptw-border-primary-500 ptw-rounded-sm"
      >
      <input
        type="color"
        :value="modelValue"
        @input="((e) => processChange((e.target as HTMLInputElement).value as string))"
      >
    </div>

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>
