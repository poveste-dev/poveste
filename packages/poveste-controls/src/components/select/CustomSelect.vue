<script lang="ts">
export default {
  name: 'CustomSelect',
}
</script>

<script lang="ts" setup>
import type { ComputedRef } from 'vue'
import type { HstControlOption } from '../../types'
import { Icon } from '@iconify/vue'
import { ListboxContent, ListboxItem, ListboxRoot, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { portalTarget } from '../../portal-target'

const props = defineProps<{
  modelValue: string
  options: Record<string, any> | string[] | number[] | HstControlOption[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const open = ref(false)

// After mount, not during setup: the chrome's `.poveste-app-root` is only in the
// document once the tree it wraps has been inserted.
const target = shallowRef<HTMLElement>()
onMounted(() => {
  target.value = portalTarget()
})

const formattedOptions: ComputedRef<[any, string][]> = computed(() => {
  if (Array.isArray(props.options)) {
    return props.options.map((option) => {
      if (typeof option === 'string' || typeof option === 'number') {
        return [option, String(option)] as [any, string]
      }
      else {
        return [option.value, option.label] as [any, string]
      }
    })
  }
  else {
    return Object.entries(props.options)
  }
})

const selectedLabel = computed(() => formattedOptions.value.find(([value]) => value === props.modelValue)?.[1])

function selectValue(value: unknown) {
  // `ListboxRoot` is asked to replace rather than toggle, so this is only ever
  // reached with a value. The guard is for the one case `replace` does not
  // cover: a `null` model reaching `update:modelValue` would write the story
  // prop away, and a select has no unselected position.
  if (value == null) {
    return
  }
  emit('update:modelValue', value as string)
  open.value = false
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <!-- A button, not the div this used to be: the trigger carries
           `aria-expanded`, which axe rejects on an element with no role — and a
           div was never reachable by keyboard either. -->
      <button
        type="button"
        class="poveste-select-trigger"
        data-slot="trigger"
      >
        <span
          class="poveste-select-label"
          data-slot="value"
        >
          <slot :label="selectedLabel">
            {{ selectedLabel }}
          </slot>
        </span>
        <Icon
          icon="carbon:chevron-sort"
          class="poveste-select-chevron"
        />
      </button>
    </PopoverTrigger>
    <PopoverPortal
      v-if="target"
      :to="target"
    >
      <PopoverContent
        class="poveste-select-popper"
        align="start"
        :side-offset="6"
        :collision-padding="8"
      >
        <ListboxRoot
          class="poveste-select-options"
          data-slot="options"
          selection-behavior="replace"
          highlight-on-hover
          :model-value="modelValue"
          @update:model-value="selectValue"
        >
          <ListboxContent
            class="poveste-select-list"
            data-slot="listbox"
          >
            <ListboxItem
              v-for="[value, label] of formattedOptions"
              :key="label"
              class="poveste-select-option"
              data-slot="option"
              :value="value"
            >
              {{ label }}
            </ListboxItem>
          </ListboxContent>
        </ListboxRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style lang="postcss">
.poveste-select-trigger {
  display: flex;
  gap: .5rem;
  align-items: center;
  width: 100%;
  height: 27px;
  padding-inline: .5rem;
  margin-block: -.25rem;
  border: 1px solid rgb(0 0 0 / .25);
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: normal;
  text-align: left;
  outline: none;
  cursor: pointer;

  /* Spelled out on the subject: `.ptw-dark` sits above the `@scope` root, so a
     descendant rule keyed on it never matches from in here (#101). */
  &:where(.ptw-dark, .ptw-dark *) {
    border-color: rgb(255 255 255 / .25);
  }

  &:hover {
    border-color: var(--color-primary-500);
  }
}

.poveste-select-label {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.poveste-select-chevron {
  flex: none;
  width: 1rem;
  height: 1rem;
  margin-left: auto;
}

.poveste-select-popper {
  /* The trigger's own width, so the options line up under it as before. */
  min-width: var(--reka-popper-anchor-width);
  z-index: 100;

  &:focus-visible {
    outline: none;
  }

  &[data-state="open"] {
    animation: poveste-select-in .15s cubic-bezier(0, 1, .5, 1);
  }
}

.poveste-select-options {
  /*
   * The room Reka measured between the trigger and the viewport edge, which is
   * what floating-vue's `auto-boundary-max-size` set and nothing replaced: a
   * list longer than that ran off the screen with no scroller anywhere, so the
   * options below the fold could not be reached at all.
   *
   * On the bordered box rather than on the popper, so the border and the
   * rounded corner stay put while the rows move under them. One axis being
   * `auto` makes the other one `auto` too, which is the clipping the
   * `overflow-hidden` this replaces was here for.
   */
  max-height: var(--reka-popover-content-available-height);
  overflow-y: auto;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  background: var(--color-gray-50);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1);

  &:where(.ptw-dark, .ptw-dark *) {
    border-color: var(--color-gray-850);
    background: var(--color-gray-700);
  }
}

.poveste-select-list {
  display: flex;
  flex-direction: column;

  &:focus-visible {
    outline: none;
  }
}

.poveste-select-option {
  padding: .25rem .5rem;
  cursor: pointer;
  outline: none;

  &[data-state='checked'] {
    background: var(--color-primary-200);

    &:where(.ptw-dark, .ptw-dark *) {
      background: var(--color-primary-800);
    }
  }

  /*
   * `data-highlighted` rather than `:hover`, which is the whole point of the
   * move: Reka sets it for the pointer and for the arrow keys alike, so the row
   * a keyboard is on is the row that looks picked. `:hover` showed nothing at
   * all to a keyboard, because there was no keyboard.
   */
  &[data-highlighted] {
    background: var(--color-primary-100);

    &:where(.ptw-dark, .ptw-dark *) {
      background: var(--color-primary-700);
    }
  }
}

@keyframes poveste-select-in {
  from {
    transform: scale(.75);
  }
}
</style>
