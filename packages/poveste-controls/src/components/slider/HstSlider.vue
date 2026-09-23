<script lang="ts">
export default {
  name: 'HstSlider',
  inheritAttrs: false,
}
</script>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import { computed, ref } from 'vue'
import HstTooltip from '../HstTooltip.vue'
import HstWrapper from '../HstWrapper.vue'

const props = defineProps<{
  title?: string
  modelValue?: number | null
  min: number
  max: number
}>()

const emit = defineEmits({
  'update:modelValue': (newValue: number) => true,
})

const showTooltip = ref(false)
const input = ref<HTMLInputElement | null>(null)

const numberModel = computed({
  get: () => props.modelValue,
  set: (value: number) => {
    emit('update:modelValue', value)
  },
})

const percentage = computed(() => {
  return ((props.modelValue ?? props.min) - props.min) / (props.max - props.min)
})

const tooltipStyle = computed<CSSProperties>(() => {
  const gap = 8
  if (input.value) {
    const position = gap + ((input.value.clientWidth - 2 * gap) * percentage.value)
    return {
      left: `${position}px`,
    }
  }
  return {}
})
</script>

<template>
  <HstWrapper
    class="poveste-slider"
    :title="title"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <div
      class="poveste-slider-field"
      data-slot="field"
    >
      <div class="poveste-slider-track-area">
        <div
          class="poveste-slider-track"
          data-slot="track"
        />
      </div>
      <input
        ref="input"
        v-model.number="numberModel"
        class="poveste-slider-input"
        data-slot="control"
        type="range"
        v-bind="{ ...$attrs, class: null, style: null, min, max }"
        @mouseover="showTooltip = true"
        @mouseleave="showTooltip = false"
      >
      <HstTooltip
        v-if="showTooltip"
        :content="String(modelValue ?? '')"
        :open="true"
        :offset="16"
      >
        <div
          class="poveste-slider-tooltip-anchor"
          :style="tooltipStyle"
        />
      </HstTooltip>
    </div>
  </HstWrapper>
</template>

<style lang="postcss">
.poveste-slider {
  align-items: center;
}

.poveste-slider-field {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.poveste-slider-track-area {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
}

.poveste-slider-track {
  width: 100%;
  height: .25rem;
  border: 1px solid rgb(0 0 0 / .25);
  border-radius: 9999px;

  &:where(.ptw-dark, .ptw-dark *) {
    border-color: rgb(255 255 255 / .25);
  }
}

.poveste-slider-tooltip-anchor {
  position: absolute;
}

/*
 * The thumb is written out rather than `@apply`ed, and the dark variant is
 * written *before* the pseudo-element rather than after it. That is not style:
 * `dark:bg-gray-700` on a `::-webkit-slider-thumb` rule compiled to
 *
 *   .range-input::-webkit-slider-thumb:where(.ptw-dark, .ptw-dark *)
 *
 * and a pseudo-element has to end its compound — nothing may follow it but a
 * user-action pseudo-class. Chrome does not drop the rule, because `:where()`
 * is forgiving: it discards the arguments it cannot use there and keeps
 *
 *   .range-input::-webkit-slider-thumb:where()
 *
 * which matches nothing at all. So the rule shipped, appeared in the stylesheet
 * and in devtools, and the thumb stayed white on a dark UI for the life of the
 * control. Six rules across both vendor prefixes, none of them reachable.
 *
 * `&:where(…)::-webkit-slider-thumb` says the same thing with the pseudo-element
 * last, which is the form that matches.
 */
.poveste-slider-input {
  position: relative;
  width: 100%;
  margin: 0;
  appearance: none;
  border: 0;
  background: transparent;
  cursor: pointer;

  &::-webkit-slider-thumb {
    width: .75rem;
    height: .75rem;
    appearance: none;
    border: 1px solid rgb(0 0 0 / .25);
    border-radius: 9999px;
    background: var(--color-white);
  }

  &:where(.ptw-dark, .ptw-dark *)::-webkit-slider-thumb {
    border-color: rgb(255 255 255 / .25);
    background: var(--color-gray-700);
  }

  &:hover::-webkit-slider-thumb {
    border-color: var(--color-primary-500);
    background: var(--color-primary-500);
  }

  /* Separate rules per prefix: Safari drops the whole list if one selector in it
     is unknown, so a grouped `::-webkit-…, ::-moz-…` loses both. */
  &::-moz-range-thumb {
    width: .75rem;
    height: .75rem;
    appearance: none;
    border: 1px solid rgb(0 0 0 / .25);
    border-radius: 9999px;
    background: var(--color-white);
  }

  &:where(.ptw-dark, .ptw-dark *)::-moz-range-thumb {
    border-color: rgb(255 255 255 / .25);
    background: var(--color-gray-700);
  }

  &:hover::-moz-range-thumb {
    border-color: var(--color-primary-500);
    background: var(--color-primary-500);
  }
}
</style>
