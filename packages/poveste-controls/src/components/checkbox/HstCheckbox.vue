<script lang="ts">
export default {
  name: 'HstCheckbox',
}
</script>

<script lang="ts" setup>
import { CheckboxRoot } from 'reka-ui'
import { computed } from 'vue'
import HstWrapper from '../HstWrapper.vue'
import HstSimpleCheckbox from './HstSimpleCheckbox.vue'

type Booleanish = boolean | 'true' | 'false'

const props = defineProps<{
  modelValue?: Booleanish | null
  title?: string
}>()

const emit = defineEmits({
  'update:modelValue': (newValue: Booleanish) => true,
})

/*
 * The wrapper keeps its default `label`, with exactly one control inside it, so
 * clicking the title toggles by native association rather than by a handler —
 * which is what a reader does and what `controls.spec.ts` asserts. That is the
 * correct use of a label; #928's trap is a label wrapping *several* controls,
 * which is `HstCheckboxList`'s bug, not this one.
 *
 * Reka then owns the role, `aria-checked`, the space key and the disabled state,
 * in place of four hand-rolled attributes.
 *
 * `trueValue`/`falseValue` carry the `Booleanish` case: a story that writes
 * `'true'`/`'false'` as strings keeps getting them back, which used to be a
 * branch in a hand-written toggle. The model has to go in wearing the same
 * shape, because the root reads its state from `isEqual(modelValue, trueValue)`
 * — a boolean under a string `trueValue` reads as unchecked forever, and every
 * click then emits `trueValue` again.
 *
 * Nothing may sit above the root in the template — a comment there makes the
 * component a fragment, and a fragment takes no fallthrough attrs, so the root
 * silently stops being a checkbox at all.
 */
const isString = computed(() => typeof props.modelValue === 'string')

const isTrue = computed(() => {
  if (typeof props.modelValue === 'string') {
    return props.modelValue !== 'false'
  }

  return props.modelValue ?? undefined
})
</script>

<template>
  <HstWrapper
    class="poveste-checkbox"
    :title="title"
  >
    <CheckboxRoot
      :model-value="isString ? String(isTrue) : isTrue"
      :true-value="isString ? 'true' : true"
      :false-value="isString ? 'false' : false"
      class="poveste-checkbox-box"
      data-slot="control"
      @update:model-value="(value: Booleanish) => emit('update:modelValue', value)"
    >
      <HstSimpleCheckbox :model-value="isTrue" />
    </CheckboxRoot>
    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>

<style lang="postcss">
.poveste-checkbox {
  align-items: center;
  cursor: pointer;
}

.poveste-checkbox-box {
  display: block;
  padding: 0;
  border: 0;
  background: none;

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
}
</style>
