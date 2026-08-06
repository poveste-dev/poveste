<script lang="ts">
export default {
  name: 'HstNumber',
  inheritAttrs: false,
}
</script>

<script lang="ts" setup>
import { computed, onUnmounted, ref } from 'vue'
import HstWrapper from '../HstWrapper.vue'

const props = defineProps<{
  title?: string
  modelValue?: number | null
}>()

const emit = defineEmits({
  'update:modelValue': (newValue: number) => true,
})

const numberModel = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})

const input = ref<HTMLInputElement>()

function focusAndSelect() {
  input.value.focus()
  input.value.select()
}

// Drag to modify

const isDragging = ref(false)
let startX: number
let startValue: number

function onMouseDown(event: MouseEvent) {
  isDragging.value = true
  startX = event.clientX
  startValue = numberModel.value
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', stopDragging)
}

function onMouseMove(event: MouseEvent) {
  let step = Number.parseFloat(input.value.step)
  if (Number.isNaN(step)) {
    step = 1
  }
  numberModel.value = startValue + Math.round((event.clientX - startX) / 10 / step) * step
}

function stopDragging() {
  isDragging.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', stopDragging)
}

onUnmounted(() => {
  stopDragging()
})
</script>

<template>
  <HstWrapper
    class="poveste-number ptw-cursor-ew-resize ptw-items-center"
    :title="title"
    :class="[
      $attrs.class,
      { 'ptw-select-none': isDragging },
    ]"
    :style="$attrs.style"
    @click="focusAndSelect"
    @mousedown="onMouseDown"
  >
    <input
      ref="input"
      v-bind="{ ...$attrs, class: null, style: null }"
      v-model.number="numberModel"
      type="number"
      :class="{
        'ptw-select-none': isDragging,
      }"
      class="ptw-text-inherit ptw-bg-transparent ptw-w-full ptw-outline-none ptw-pl-2 ptw-py-1 -ptw-my-1 ptw-border ptw-border-solid ptw-border-black/25 dark:ptw-border-white/25 focus:ptw-border-primary-500 dark:focus:ptw-border-primary-500 ptw-rounded-sm ptw-cursor-ew-resize ptw-box-border"
    >

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>
