<script lang="ts" setup>
import type { ComputedRef } from 'vue'
import { Icon } from '@iconify/vue'
import { refAutoReset } from '@vueuse/core'
import { Dropdown as VDropdown } from 'floating-vue'
import { computed, ref, useId } from 'vue'

/*
 * The WAI-ARIA select-only combobox: the trigger keeps focus and names the active
 * option through `aria-activedescendant`, so the popup needs no focus of its own.
 * It was a click-only `<div>` with `<div>` options, which a keyboard could not open
 * and a screen reader did not list (#828).
 */

const props = defineProps<{
  modelValue: string
  options: Record<string, string> | Array<string>
  /** The accessible name of the picker and its list. */
  label: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', value: string): void
}>()

const formattedOptions: ComputedRef<Record<string, string>> = computed(() => {
  if (Array.isArray(props.options)) {
    return Object.fromEntries(props.options.map(value => [value, value]))
  }
  return props.options
})

const entries = computed(() => Object.entries(formattedOptions.value))

const selectedLabel = computed(() => formattedOptions.value[props.modelValue])

const id = useId()
const listboxId = `${id}-listbox`
function optionId(index: number) {
  return `${id}-option-${index}`
}

const combobox = ref<HTMLElement>()
const open = ref(false)
const activeIndex = ref(-1)

function openList(index?: number) {
  const selected = entries.value.findIndex(([value]) => value === props.modelValue)
  activeIndex.value = index ?? Math.max(selected, 0)
  open.value = true
}

/*
 * Type-to-select, as the pattern recommends: typed characters within half a second
 * form one search, and repeating a single character steps through the options
 * that start with it.
 */
const typed = refAutoReset('', 500)

function isTypeaheadKey(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) {
    return false
  }
  // Space chooses, unless it continues a search already under way.
  return event.key !== ' ' || typed.value !== ''
}

function typeahead(char: string) {
  const previous = typed.value
  typed.value = previous + char.toLowerCase()
  const repeated = [...typed.value].every(c => c === typed.value[0])
  const search = repeated ? typed.value.charAt(0) : typed.value
  // A new or repeated character looks past the active option; a longer search may
  // still match it.
  const start = repeated ? activeIndex.value + 1 : Math.max(activeIndex.value, 0)
  const count = entries.value.length
  for (let offset = 0; offset < count; offset++) {
    const index = (start + offset) % count
    if (entries.value[index]?.[1].toLowerCase().startsWith(search)) {
      activeIndex.value = index
      return
    }
  }
}

function close() {
  open.value = false
}

function choose(index: number) {
  const entry = entries.value[index]
  if (entry) {
    emit('update:modelValue', entry[0])
    emit('select', entry[0])
  }
  close()
  combobox.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  const last = entries.value.length - 1

  if (isTypeaheadKey(event)) {
    event.preventDefault()
    if (!open.value) {
      openList()
    }
    typeahead(event.key)
    return
  }

  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      openList(event.key === 'Home' ? 0 : event.key === 'End' ? last : undefined)
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      activeIndex.value = Math.min(activeIndex.value + 1, last)
      break
    case 'ArrowUp':
      event.preventDefault()
      if (event.altKey) {
        choose(activeIndex.value)
      }
      else {
        activeIndex.value = Math.max(activeIndex.value - 1, 0)
      }
      break
    case 'Home':
      event.preventDefault()
      activeIndex.value = 0
      break
    case 'End':
      event.preventDefault()
      activeIndex.value = last
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      choose(activeIndex.value)
      break
    case 'Escape':
      event.preventDefault()
      close()
      break
    case 'Tab':
      // Keeps the default: focus moves on, with the active option chosen.
      choose(activeIndex.value)
      break
  }
}

defineExpose({
  focus: () => combobox.value?.focus(),
})
</script>

<template>
  <!-- `no-auto-focus`: floating-vue otherwise moves focus into the popup once it
       shows, and the combobox pattern keeps it on the trigger, which owns the keys. -->
  <VDropdown
    v-model:shown="open"
    class="poveste-base-select"
    :triggers="[]"
    no-auto-focus
    auto-size
    auto-boundary-max-size
  >
    <div
      ref="combobox"
      role="combobox"
      tabindex="0"
      :aria-label="label"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="open ? listboxId : undefined"
      :aria-activedescendant="open && activeIndex >= 0 ? optionId(activeIndex) : undefined"
      class="cursor-pointer w-full outline-none focus-visible:border-primary-500 px-2 h-[27px] -my-1 border border-solid border-black/25 dark:border-white/25 hover:border-primary-500 dark:hover:border-primary-500 rounded-sm flex gap-2 items-center leading-normal"
      @click="open ? close() : openList()"
      @keydown="onKeydown"
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
    <template #popper>
      <div
        :id="listboxId"
        role="listbox"
        :aria-label="label"
        class="flex flex-col bg-gray-50 dark:bg-gray-700"
      >
        <div
          v-for="([value, optionLabel], index) of entries"
          :id="optionId(index)"
          :key="value"
          role="option"
          :aria-selected="value === modelValue"
          class="px-2 py-1 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-700"
          :class="{
            'bg-primary-200 dark:bg-primary-800': value === modelValue,
            'outline outline-2 -outline-offset-2 outline-primary-500': index === activeIndex,
          }"
          @mousedown.prevent
          @mousemove="activeIndex = index"
          @click="choose(index)"
        >
          <slot
            name="option"
            :label="optionLabel"
            :value="value"
          >
            {{ optionLabel }}
          </slot>
        </div>
      </div>
    </template>
  </VDropdown>
</template>
