<script lang="ts">
export default {
  name: 'CustomSelect',
}
</script>

<script lang="ts" setup>
import type { ComputedRef } from 'vue'
import type { HstControlOption } from '../../types'
import { Icon } from '@iconify/vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
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

function selectValue(value: any) {
  emit('update:modelValue', value)
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
        class="cursor-pointer w-full text-left bg-transparent outline-none px-2 h-[27px] -my-1 border border-solid border-black/25 dark:border-white/25 hover:border-primary-500 dark:hover:border-primary-500 rounded-sm flex gap-2 items-center leading-normal"
      >
        <span class="flex-1 truncate">
          <slot :label="selectedLabel">
            {{ selectedLabel }}
          </slot>
        </span>
        <Icon
          icon="carbon:chevron-sort"
          class="w-4 h-4 flex-none ml-auto"
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
        <div class="poveste-select-options flex flex-col bg-gray-50 dark:bg-gray-700 border border-solid border-gray-200 dark:border-gray-850 rounded-sm shadow-md">
          <div
            v-for="[value, label] of formattedOptions"
            v-bind="{ ...$attrs, class: null, style: null }"
            :key="label"
            class="px-2 py-1 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-700"
            :class="{
              'bg-primary-200 dark:bg-primary-800': props.modelValue === value,
            }"
            @click="selectValue(value)"
          >
            {{ label }}
          </div>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style lang="postcss">
/* v4: @apply in a component <style> needs the theme referenced explicitly. */
@reference "../../style/main.css";

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
}

@keyframes poveste-select-in {
  from {
    transform: scale(.75);
  }
}
</style>
