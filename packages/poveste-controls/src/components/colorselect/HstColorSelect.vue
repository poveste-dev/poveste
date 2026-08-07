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
    class="poveste-select cursor-text items-center"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <div class="flex flex-row gap-1">
      <input
        v-bind="{ ...$attrs, class: null, style: null }"
        v-model="stringModel"
        type="text"
        class="text-inherit bg-transparent w-full outline-none px-2 py-1 -my-1 border border-solid border-black/25 dark:border-white/25 focus:border-primary-500 dark:focus:border-primary-500 rounded-sm"
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
