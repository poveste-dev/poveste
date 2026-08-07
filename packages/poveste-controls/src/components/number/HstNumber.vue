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
    class="poveste-number cursor-ew-resize items-center"
    :title="title"
    :class="[
      $attrs.class,
      { 'select-none': isDragging },
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
        'select-none': isDragging,
      }"
      class="text-inherit bg-transparent w-full outline-none pl-2 py-1 -my-1 border border-solid border-black/25 dark:border-white/25 focus:border-primary-500 dark:focus:border-primary-500 rounded-sm cursor-ew-resize box-border"
    >

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>
