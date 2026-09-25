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
  set: (value: number) => {
    emit('update:modelValue', value)
  },
})

const input = ref<HTMLInputElement>()

function focusAndSelect() {
  input.value?.focus()
  input.value?.select()
}

// Drag to modify

const isDragging = ref(false)
let startX: number
let startValue: number

function onMouseDown(event: MouseEvent) {
  isDragging.value = true
  startX = event.clientX
  startValue = numberModel.value ?? 0
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', stopDragging)
}

function onMouseMove(event: MouseEvent) {
  let step = Number.parseFloat(input.value?.step ?? '')
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
    class="poveste-number"
    :title="title"
    :class="$attrs.class"
    :style="$attrs.style"
    :data-dragging="isDragging ? '' : undefined"
    @click="focusAndSelect"
    @mousedown="onMouseDown"
  >
    <input
      ref="input"
      v-bind="{ ...$attrs, class: null, style: null }"
      v-model.number="numberModel"
      type="number"
      class="poveste-number-input"
      data-slot="control"
    >

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>

<style lang="postcss">
.poveste-number {
  align-items: center;
  cursor: ew-resize;

  /*
   * On the wrapper, so the selection the drag would otherwise make is
   * suppressed for the label and the field together. A drag that starts on the
   * label crosses the input, and selecting text under the pointer while the
   * number is changing looks like the control has lost it.
   */
  &[data-dragging] {
    user-select: none;
  }
}

.poveste-number-input {
  box-sizing: border-box;
  width: 100%;
  padding: .25rem 0 .25rem .5rem;
  margin-block: -.25rem;
  border: 1px solid rgb(0 0 0 / .25);
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  cursor: ew-resize;
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
