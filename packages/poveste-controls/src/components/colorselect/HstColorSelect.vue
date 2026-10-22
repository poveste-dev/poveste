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
  set: (value: string) => {
    emit('update:modelValue', value)
  },
})

function throttle<Args extends unknown[]>(cb: (...args: Args) => void, delay = 15) {
  let shouldWait = false
  let waitingArgs: Args | null = null
  const timeoutFunc = () => {
    if (waitingArgs == null) {
      shouldWait = false
    }
    else {
      cb(...waitingArgs)
      waitingArgs = null
      setTimeout(timeoutFunc, delay)
    }
  }

  return (...args: Args) => {
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
function processChange(inp: string) {
  updateValue(inp)
}
</script>

<template>
  <HstWrapper
    :title="title"
    class="poveste-select poveste-color-select"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <div class="poveste-color-select-fields">
      <input
        v-bind="{ ...$attrs, class: null, style: null }"
        v-model="stringModel"
        type="text"
        class="poveste-color-select-input"
        data-slot="input"
      >
      <input
        type="color"
        data-slot="picker"
        :value="modelValue"
        @input="((e) => processChange((e.target as HTMLInputElement).value as string))"
      >
    </div>

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>

<style lang="postcss">
.poveste-color-select {
  align-items: center;
  cursor: text;
}

.poveste-color-select-fields {
  display: flex;
  gap: .25rem;
}

/* The same field as `HstText`'s. */
.poveste-color-select-input {
  box-sizing: border-box;
  width: 100%;
  padding: .25rem .5rem;
  margin-block: -.25rem;
  border: 1px solid rgb(0 0 0 / .25);
  border-radius: var(--_poveste-radius-sm);
  background: transparent;
  color: inherit;
  outline: none;

  &:where(.ptw-dark, .ptw-dark *) {
    border-color: rgb(255 255 255 / .25);
  }

  &:focus {
    border-color: var(--_poveste-primary-500);
  }
}
</style>
