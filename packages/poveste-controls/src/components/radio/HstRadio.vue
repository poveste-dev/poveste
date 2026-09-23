<script lang="ts">
export default {
  name: 'HstRadio',
}
</script>

<script lang="ts" setup>
import type { ComputedRef } from 'vue'
import type { HstControlOption } from '../../types'
import { Label, RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import HstWrapper from '../HstWrapper.vue'

const props = defineProps<{
  title?: string
  modelValue?: string | null
  options: HstControlOption[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

/*
 * Every option used to carry a `name` containing its own value, so no two were
 * ever in one radio group: nothing excluded anything natively, and the arrow
 * keys a radio group owes a reader did nothing. `RadioGroupRoot` is one group
 * by construction, and brings the roving focus with it.
 *
 * The wrapper is a `div`. Its default is a `label`, which with `role="group"`
 * rendered a label wrapping one label per option — nested labels are invalid,
 * and a label over several controls is #928's trap.
 *
 * Each option's root stays a button, which is `RadioGroupItem`'s default and
 * avoids two of #969's three regressions at once: a button has space and enter
 * natively, and a `Label` forwards a click only to a labelable element.
 *
 * Nothing may sit above the root in the template — a comment there makes the
 * component a fragment, a fragment takes no fallthrough attrs, and the root
 * silently stops being the control.
 *
 * `?? null` rather than `?? undefined` on the model: `exactOptionalPropertyTypes`
 * refuses `undefined` for an optional prop that does not name it, and `null` is
 * in Reka's `AcceptableValue` and is what "nothing selected" means anyway.
 *
 * No deselect guard here, unlike the button group and the select beside it.
 * `ToggleGroupRoot` and `ListboxRoot` both default to toggling — a second click
 * on the value they already hold emits `undefined`, which writes a story prop
 * away. `RadioGroupRoot` does not: its `changeModelValue` is a plain
 * assignment, with no comparison against the current value. Written down
 * because three guarded controls make the fourth look like an oversight.
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
    class="poveste-radio"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <RadioGroupRoot
      :model-value="modelValue ?? null"
      class="poveste-radio-options"
      data-slot="options"
      @update:model-value="(value: unknown) => emit('update:modelValue', value as string)"
    >
      <Label
        v-for="(label, value) in formattedOptions"
        :key="value"
        class="poveste-radio-option"
        data-slot="option"
      >
        <RadioGroupItem
          :value="value"
          class="poveste-radio-box"
          data-slot="control"
        >
          <span
            class="poveste-radio-dot"
            data-slot="dot"
          />
        </RadioGroupItem>
        {{ label }}
      </Label>
    </RadioGroupRoot>

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>

<style lang="postcss">
.poveste-radio {
  cursor: text;
}

.poveste-radio-options {
  margin-block: -.25rem;
}

.poveste-radio-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: .5rem;
  padding-block: .25rem;
  cursor: pointer;
}

.poveste-radio-box {
  position: relative;
  display: block;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1px solid rgb(0 0 0 / .25);
  border-radius: 9999px;
  background: none;

  /* Opt in, matching `HomeCounter`: an engine without the query animates
     nothing, rather than animating for someone who asked it not to. */
  @media (prefers-reduced-motion: no-preference) {
    transition: border-color .15s ease-out;
  }

  /* Spelled out on the subject: `.ptw-dark` sits above the `@scope` root, so a
     descendant rule keyed on it never matches from in here (#101). */
  &:where(.ptw-dark, .ptw-dark *) {
    border-color: rgb(255 255 255 / .25);
  }

  &:hover,
  &[data-state='checked'] {
    border-color: var(--color-primary-500);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
}

.poveste-radio-dot {
  position: absolute;
  inset: 3px;
  display: block;
  border-radius: 9999px;
  background: var(--color-primary-500);
  transform: scale(0);

  @media (prefers-reduced-motion: no-preference) {
    transition: transform .2s ease-in-out;
  }

  [data-state='checked'] > & {
    transform: scale(1);

    @media (prefers-reduced-motion: no-preference) {
      transition-delay: .15s;
    }
  }
}
</style>
