<script lang="ts">
export default {
  name: 'HstSimpleCheckbox',
}
</script>

<script setup lang="ts">
import { CheckboxRoot } from 'reka-ui'
import CheckboxVisual from './CheckboxVisual.vue'

defineProps<{
  modelValue?: boolean | undefined
  withToggle?: boolean | undefined
}>()

const emit = defineEmits({
  'update:modelValue': (newValue: boolean) => true,
})

/*
 * Two shapes, written as two branches rather than one dynamic `is`. With
 * `withToggle` this box is the control, so it owns the checkbox role and the
 * keyboard; without it the box is decoration inside someone else's
 * `CheckboxRoot`, and a second role there announces two checkboxes for one.
 */
</script>

<template>
  <CheckboxRoot
    v-if="withToggle"
    :model-value="modelValue ?? false"
    class="poveste-simple-checkbox poveste-simple-checkbox-interactive"
    data-slot="box"
    :data-checked="modelValue ? '' : undefined"
    @update:model-value="(value: unknown) => emit('update:modelValue', value === true)"
  >
    <CheckboxVisual :model-value="modelValue" />
  </CheckboxRoot>
  <span
    v-else
    class="poveste-simple-checkbox"
    data-slot="box"
    :data-checked="modelValue ? '' : undefined"
  >
    <CheckboxVisual :model-value="modelValue" />
  </span>
</template>

<style lang="postcss">
.poveste-simple-checkbox {
  position: relative;
  display: block;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-white);

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
}

.poveste-simple-checkbox-interactive {
  cursor: pointer;
}

.poveste-checkbox-visual {
  position: absolute;
  inset: 0;
  display: block;
}

.poveste-checkbox-visual-box {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 1px solid rgb(0 0 0 / .25);
  border-radius: var(--radius-sm);

  /* Opt in, matching `HomeCounter`: an engine without the query animates
     nothing, rather than animating for someone who asked it not to. */
  @media (prefers-reduced-motion: no-preference) {
    transition: border .15s ease-out;
    transition-delay: .15s;
  }

  /* Spelled out on the subject: `.ptw-dark` sits above the `@scope` root, so a
     descendant rule keyed on it never matches from in here (#101). */
  &:where(.ptw-dark, .ptw-dark *) {
    border-color: rgb(255 255 255 / .25);
  }

  .poveste-simple-checkbox[data-checked] & {
    border-color: var(--color-primary-500);
    border-width: 8px;

    @media (prefers-reduced-motion: no-preference) {
      transition-delay: 0s;
    }
  }

  .poveste-simple-checkbox:hover & {
    border-color: var(--color-primary-500);
  }

  .poveste-simple-checkbox:active & {
    background: rgb(107 114 128 / .2);
  }
}

.poveste-checkbox-visual-check {
  position: relative;
  z-index: 10;

  path {
    stroke: var(--color-white);
    stroke-width: 2;
  }
}

/*
 * The tick draws itself by running `stroke-dashoffset` down to zero. That is the
 * one piece of motion here a reader might not want, so it is opt-in like the
 * rest — without the preference the tick is simply there.
 */
.poveste-checkbox-visual-animated {
  @media (prefers-reduced-motion: no-preference) {
    transition: all .2s ease-in-out;

    .poveste-simple-checkbox[data-checked] & {
      transition-delay: .15s;
    }
  }
}
</style>
