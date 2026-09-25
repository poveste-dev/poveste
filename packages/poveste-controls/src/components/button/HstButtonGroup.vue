<script lang="ts">
export default {
  name: 'HstButtonGroup',
}
</script>

<script setup lang="ts">
import type { ComputedRef } from 'vue'
import type { HstControlOption } from '../../types'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import HstWrapper from '../HstWrapper.vue'
import HstButton from './HstButton.vue'

const props = defineProps<{
  title?: string
  modelValue?: string
  options: string[] | number[] | HstControlOption[] | Record<string, string | number>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const formattedOptions: ComputedRef<HstControlOption[]> = computed(() => {
  if (Array.isArray(props.options)) {
    return props.options.map((value: string | number | HstControlOption) => {
      if (typeof value === 'string' || typeof value === 'number') {
        return { value, label: String(value) }
      }
      else {
        return value
      }
    })
  }
  else {
    return Object.entries(props.options).map(([value, label]) => ({
      value,
      label: String(label),
    }))
  }
})

/*
 * `ToggleGroupRoot` in single mode deselects on a second click: its
 * `changeModelValue` emits `undefined` when the clicked value is the one
 * already held. A button group picks one of a fixed set and has no empty
 * position, so that is dropped here rather than written back as a story prop
 * that has vanished. The old hand-rolled group re-emitted the same value, which
 * is what this keeps.
 */
function onUpdate(value: unknown) {
  if (value != null) {
    emit('update:modelValue', value as string)
  }
}
</script>

<template>
  <HstWrapper
    tag="div"
    :title="title"
    class="poveste-button-group"
  >
    <!-- `role="group"` is `ToggleGroupRoot`'s own, and it sits here rather than
         on the wrapper so the group is the buttons instead of the buttons plus
         their title. -->
    <ToggleGroupRoot
      type="single"
      class="poveste-button-group-options"
      data-slot="options"
      :model-value="modelValue ?? null"
      @update:model-value="onUpdate"
    >
      <ToggleGroupItem
        v-for="{ label, value } of formattedOptions"
        :key="value"
        as-child
        :value="value"
      >
        <HstButton
          class="poveste-button-group-option"
          data-slot="option"
        >
          {{ label }}
        </HstButton>
      </ToggleGroupItem>
    </ToggleGroupRoot>

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>

<style lang="postcss">
.poveste-button-group {
  flex-wrap: nowrap;
  align-items: center;
}

.poveste-button-group-options {
  display: flex;
  gap: 1px;
  padding: 1px;
  border: 1px solid rgb(0 0 0 / .25);
  border-radius: var(--radius-sm);

  &:where(.ptw-dark, .ptw-dark *) {
    border-color: rgb(255 255 255 / .25);
  }
}

/*
 * Qualified by `data-state` rather than selected by a `color` prop computed
 * from `modelValue`: the attribute is what Reka considers pressed, so the
 * colour cannot disagree with `aria-pressed` the way a second derivation can.
 *
 * Both rules are `[data-state]`-qualified on purpose. `.poveste-button` carries
 * its own defaults at one class of specificity, and these have to beat them
 * whichever component's `<style>` the bundler emits first.
 */
.poveste-button-group-option {
  flex: 1;
  height: 22px;
  padding-inline: .25rem;
  border-radius: 3px;

  &[data-state='off'] {
    --_poveste-button-surface: transparent;
    --_poveste-button-surface-hover: color-mix(in oklab, var(--color-gray-500) 20%, transparent);
  }

  &[data-state='on'] {
    --_poveste-button-surface: var(--color-primary-500);
    --_poveste-button-surface-hover: var(--color-primary-600);
    --_poveste-button-text: var(--color-white);

    &:where(.ptw-dark, .ptw-dark *) {
      --_poveste-button-text: var(--color-black);
    }
  }
}
</style>
