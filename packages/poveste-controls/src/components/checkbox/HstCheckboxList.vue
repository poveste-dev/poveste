<script lang="ts">
export default {
  name: 'HstCheckboxList',
}
</script>

<script lang="ts" setup>
import type { ComputedRef } from 'vue'
import type { HstControlOption } from '../../types'
import { CheckboxGroupRoot, CheckboxRoot, Label } from 'reka-ui'
import { computed } from 'vue'
import HstWrapper from '../HstWrapper.vue'
import HstSimpleCheckbox from './HstSimpleCheckbox.vue'

const props = defineProps<{
  title?: string
  modelValue: Array<string>
  options: string[] | HstControlOption[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Array<string>): void
}>()

/*
 * The wrapper is a `div`, not its default `label`. This rendered a `label` with
 * `role="group"` wrapping one `label` per option: nested labels are invalid, and
 * a label wrapping several controls is the focus trap #928 found on the date
 * field — a click lands on whichever control the label resolves to rather than
 * the one under the pointer.
 *
 * `CheckboxGroupRoot` brings roving focus, so arrow keys move between options
 * and the group is one tab stop rather than one per option.
 */
const formattedOptions: ComputedRef<Record<string, string>> = computed(() => {
  if (Array.isArray(props.options)) {
    return Object.fromEntries(props.options.map((value: string | HstControlOption) => {
      if (typeof value === 'string') {
        return [value, value]
      }
      else {
        return [value.value, value.label]
      }
    }))
  }
  return props.options
})
</script>

<template>
  <HstWrapper
    tag="div"
    :title="title"
    class="poveste-checkbox-list"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <CheckboxGroupRoot
      :model-value="modelValue"
      class="poveste-checkbox-list-options"
      @update:model-value="(value: unknown) => emit('update:modelValue', value as string[])"
    >
      <Label
        v-for="(label, value) in formattedOptions"
        :key="value"
        class="poveste-checkbox-list-option"
      >
        <CheckboxRoot
          as="span"
          :value="value"
          class="poveste-checkbox-list-box"
        >
          <HstSimpleCheckbox :model-value="modelValue.includes(value)" />
        </CheckboxRoot>
        {{ label }}
      </Label>
    </CheckboxGroupRoot>

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>

<style lang="postcss">
.poveste-checkbox-list {
  cursor: text;
}

.poveste-checkbox-list-options {
  margin-block: -.25rem;
}

.poveste-checkbox-list-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: .5rem;
  padding-block: .25rem;
  cursor: pointer;
}

.poveste-checkbox-list-box {
  display: block;

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
}
</style>
