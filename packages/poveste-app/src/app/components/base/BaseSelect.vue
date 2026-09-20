<script lang="ts" setup>
import type { ComputedRef } from 'vue'
import { Icon } from '@iconify/vue'
import { PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot, portalTarget } from '@poveste/controls'
import { refAutoReset } from '@vueuse/core'
import { computed, nextTick, onMounted, ref, shallowRef, useId, watch } from 'vue'

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

// After mount, not during setup: the chrome's root is only in the document once
// the tree it wraps has been inserted.
const target = shallowRef<HTMLElement>()
onMounted(() => {
  target.value = portalTarget()
})

/*
 * Reka spares its own trigger from the dismiss it fires on any pointer or focus
 * landing outside the popup — but only a `PopoverTrigger` registers as one, and
 * this trigger cannot be that: `PopoverTrigger` writes its own `aria-expanded`,
 * `aria-controls` and `aria-haspopup="dialog"` over the listbox wiring the
 * combobox pattern is built on. So the dismiss is declined here instead.
 *
 * Without it the popup is impossible to close by clicking the picker: the
 * dismiss lands on `pointerdown`, the handler below then reads `open` as false
 * and opens it again, and the whole thing looks like a click that did nothing.
 * Neither aria spec catches it — both drive this from the keyboard, on purpose.
 */
function keepOpenOnTheTrigger(event: Event) {
  if (combobox.value?.contains(event.target as Node)) {
    event.preventDefault()
  }
}

/*
 * A capped list scrolls, and `aria-activedescendant` moves an option the browser
 * has no reason to reveal — the focus never leaves the trigger, so nothing
 * scrolls on its own.
 */
watch([open, activeIndex], async ([isOpen, index]) => {
  if (!isOpen || index < 0) {
    return
  }
  await nextTick()
  target.value?.ownerDocument.getElementById(optionId(index))?.scrollIntoView({ block: 'nearest' })
})

defineExpose({
  focus: () => combobox.value?.focus(),
})
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverAnchor
      as-child
      class="poveste-base-select"
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
    </PopoverAnchor>

    <PopoverPortal
      v-if="target"
      :to="target"
    >
      <!-- The popup takes no focus at either end: the combobox pattern keeps it on
           the trigger, which owns the keys. Deliberate rather than load-bearing
           today — Reka moves focus into the content on open, and only skips it
           here because the options are divs with nothing focusable in them. The
           aria specs cannot fail on this, so removing it would look safe. -->
      <PopoverContent
        class="poveste-base-select-popper"
        align="start"
        :side-offset="6"
        :collision-padding="8"
        @open-auto-focus.prevent
        @close-auto-focus.prevent
        @interact-outside="keepOpenOnTheTrigger"
      >
        <div
          :id="listboxId"
          role="listbox"
          :aria-label="label"
          class="poveste-base-select-options flex flex-col bg-gray-50 dark:bg-gray-700"
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
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style lang="pcss">
.poveste-base-select-popper {
  /* The trigger's own width, which is what floating-vue's `auto-size` gave. */
  min-width: var(--reka-popper-anchor-width);
  z-index: 100;

  &:focus-visible {
    outline: none;
  }
}

.poveste-base-select-options {
  /* The room Reka measured between the trigger and the viewport edge, which is
     what `auto-boundary-max-size` gave: a story with more presets than fit below
     its picker otherwise drew them off the screen, reachable by nothing. */
  max-height: var(--reka-popover-content-available-height);
  overflow-y: auto;
}
</style>
