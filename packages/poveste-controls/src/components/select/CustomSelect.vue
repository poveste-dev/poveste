<script lang="ts">
export default {
  name: 'CustomSelect',
}
</script>

<script lang="ts" setup>
import type { ComputedRef } from 'vue'
import type { HstControlOption } from '../../types'
import { Icon } from '@iconify/vue'
import { Dropdown as VDropdown } from 'floating-vue'
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
  options: Record<string, any> | string[] | number[] | HstControlOption[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

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

function selectValue(value: any, hide: () => void) {
  emit('update:modelValue', value)
  hide()
}
</script>

<template>
  <VDropdown
    auto-size
    auto-boundary-max-size
  >
    <div
      class="cursor-pointer w-full outline-none px-2 h-[27px] -my-1 border border-solid border-black/25 dark:border-white/25 hover:border-primary-500 dark:hover:border-primary-500 rounded-sm flex gap-2 items-center leading-normal"
    >
      <div class="flex-1 truncate">
        <slot :label="selectedLabel">
          {{ selectedLabel }}
        </slot>
      </div>
      <Icon
        icon="carbon:chevron-sort"
        class="w-4 h-4 flex-none ml-auto"
      />
    </div>
    <template #popper="{ hide }">
      <div class="flex flex-col bg-gray-50 dark:bg-gray-700">
        <div
          v-for="[value, label] of formattedOptions"
          v-bind="{ ...$attrs, class: null, style: null }"
          :key="label"
          class="px-2 py-1 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-700"
          :class="{
            'bg-primary-200 dark:bg-primary-800': props.modelValue === value,
          }"
          @click="selectValue(value, hide)"
        >
          {{ label }}
        </div>
      </div>
    </template>
  </VDropdown>
</template>

<style lang="postcss">
/* v4: @apply in a component <style> needs the theme referenced explicitly. */
@reference "../../style/main.css";

/* @TODO custom themes */

.v-popper {
  line-height: 0;
}

.v-popper--theme-dropdown {
  /*
   * `dark:` rather than `.ptw-dark &` — the chrome CSS is wrapped in `@scope`
   * and `.ptw-dark` lives on `<html>`, above the scope root, so a descendant
   * rule keyed on it never matches and the select's options fall back to
   * floating-vue's stock light theme (black text on the dark UI). See #101.
   */
  .v-popper__inner {
    @apply dark:bg-gray-700 dark:border-gray-850 dark:text-gray-100;
  }

  .v-popper__arrow-inner {
    @apply dark:border-gray-700;
  }

  .v-popper__arrow-outer {
    @apply dark:border-gray-850;
  }

  &.v-popper__popper--show-from .v-popper__wrapper {
    transform: scale(.75);
  }

  &.v-popper__popper--show-to .v-popper__wrapper {
    transform: none;
    transition: transform .15s cubic-bezier(0, 1, .5, 1);
  }
}

.v-popper__popper:focus-visible {
  outline: none;
}
</style>
