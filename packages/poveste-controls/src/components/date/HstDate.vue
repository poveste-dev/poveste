<script lang="ts">
export default {
  name: 'HstDate',
}
</script>

<script lang="ts" setup>
import type { Time } from '@internationalized/date'
import type { DateValue } from 'reka-ui'
import { Icon } from '@iconify/vue'
import {
  DatePickerCalendar,
  DatePickerCell,
  DatePickerCellTrigger,
  DatePickerContent,
  DatePickerField,
  DatePickerGrid,
  DatePickerGridBody,
  DatePickerGridHead,
  DatePickerGridRow,
  DatePickerHeadCell,
  DatePickerHeader,
  DatePickerHeading,
  DatePickerInput,
  DatePickerNext,
  DatePickerPrev,
  DatePickerRoot,
  DatePickerTrigger,
  TimeFieldInput,
  TimeFieldRoot,
} from 'reka-ui'
import { computed, onMounted, shallowRef, watch } from 'vue'
import { portalTarget } from '../../portal-target'
import HstWrapper from '../HstWrapper.vue'
import { dateOf, isoOf, timeOf } from './iso'

const props = withDefaults(defineProps<{
  title?: string | undefined
  /** ISO — `2026-09-20`, or `2026-09-20T14:30` when `time` is set. */
  modelValue?: string | null | undefined
  /** Adds the hour and minute segments, and puts them in the value. */
  time?: boolean
}>(), {
  title: undefined,
  modelValue: undefined,
  time: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const date = computed(() => dateOf(props.modelValue))

/*
 * The hour the field shows, held here rather than read back out of the value.
 *
 * An ISO string has nowhere to put an hour until it has a day, so `isoOf` gives
 * `''` while there is no date — and a reader who fills the time segments before
 * the date would watch them blank themselves, with nothing to say why. This
 * keeps what they typed until a date arrives to compose with, and follows the
 * value wherever the value carries one of its own.
 */
// `shallowRef`, not `ref`: `UnwrapRef` rewrites a class instance structurally,
// and the result is no longer assignable back to `Time`.
const clock = shallowRef<Time | undefined>(timeOf(props.modelValue))
watch(() => timeOf(props.modelValue), (value) => {
  if (value) {
    clock.value = value
  }
})

function writeDate(next: DateValue | undefined) {
  emit('update:modelValue', isoOf(next as never, clock.value, props.time))
}

function writeTime(next: Time | undefined) {
  clock.value = next
  emit('update:modelValue', isoOf(date.value, next, props.time))
}

// The calendar is teleported, not left in the controls panel: the panel scrolls,
// and a popper positioned inside a scrolling ancestor is clipped by it. Vue moves
// the DOM and keeps the component tree, so Reka's provides still reach it.
const target = shallowRef<HTMLElement>()
onMounted(() => {
  target.value = portalTarget()
})

const SEGMENT = 'px-0.5 rounded-sm focus:outline-none focus:bg-primary-500 focus:text-white data-[placeholder]:opacity-50'
const FIELD = 'flex items-center h-[27px] -my-1 px-2 gap-px border border-solid border-black/25 dark:border-white/25 focus-within:border-primary-500 dark:focus-within:border-primary-500 rounded-sm'
</script>

<template>
  <!-- A div, not the wrapper's default label: a click anywhere in a label moves
       focus to the first labelable thing inside it, which here is the hidden
       input Reka renders for form submission rather than the segment clicked. -->
  <HstWrapper
    tag="div"
    :title="title"
    class="poveste-date items-center"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <span class="flex gap-2 items-center flex-wrap">
      <DatePickerRoot
        :model-value="date ?? null"
        @update:model-value="writeDate($event)"
      >
        <DatePickerField
          v-slot="{ segments }"
          :class="FIELD"
        >
          <DatePickerInput
            v-for="item of segments"
            :key="item.part"
            :part="item.part"
            :class="item.part === 'literal' ? 'opacity-50' : SEGMENT"
          >
            {{ item.value }}
          </DatePickerInput>
          <DatePickerTrigger
            class="ml-1 flex p-0 bg-transparent border-0 text-inherit opacity-50 hover:opacity-100 hover:text-primary-500 cursor-pointer"
            aria-label="Open the calendar"
          >
            <Icon
              icon="carbon:calendar"
              class="w-4 h-4"
            />
          </DatePickerTrigger>
        </DatePickerField>

        <Teleport
          v-if="target"
          :to="target"
        >
          <DatePickerContent
            class="poveste-date-calendar"
            :side-offset="6"
          >
            <DatePickerCalendar
              v-slot="{ weekDays, grid }"
              class="p-2"
            >
              <DatePickerHeader class="flex items-center justify-between pb-2">
                <DatePickerPrev class="poveste-date-step">
                  <Icon
                    icon="carbon:chevron-left"
                    class="w-4 h-4"
                  />
                </DatePickerPrev>
                <DatePickerHeading />
                <DatePickerNext class="poveste-date-step">
                  <Icon
                    icon="carbon:chevron-right"
                    class="w-4 h-4"
                  />
                </DatePickerNext>
              </DatePickerHeader>

              <DatePickerGrid
                v-for="month of grid"
                :key="month.value.toString()"
                class="border-collapse"
              >
                <DatePickerGridHead>
                  <DatePickerGridRow>
                    <DatePickerHeadCell
                      v-for="day of weekDays"
                      :key="day"
                      class="w-7 text-xs font-normal opacity-50"
                    >
                      {{ day }}
                    </DatePickerHeadCell>
                  </DatePickerGridRow>
                </DatePickerGridHead>
                <DatePickerGridBody>
                  <DatePickerGridRow
                    v-for="(week, index) of month.rows"
                    :key="`week-${index}`"
                  >
                    <DatePickerCell
                      v-for="cell of week"
                      :key="cell.toString()"
                      :date="cell"
                    >
                      <DatePickerCellTrigger
                        :day="cell"
                        :month="month.value"
                        class="poveste-date-day"
                      />
                    </DatePickerCell>
                  </DatePickerGridRow>
                </DatePickerGridBody>
              </DatePickerGrid>
            </DatePickerCalendar>
          </DatePickerContent>
        </Teleport>
      </DatePickerRoot>

      <TimeFieldRoot
        v-if="time"
        v-slot="{ segments }"
        :model-value="clock ?? null"
        granularity="minute"
        :class="FIELD"
        @update:model-value="writeTime($event as Time | undefined)"
      >
        <TimeFieldInput
          v-for="item of segments"
          :key="item.part"
          :part="item.part"
          :class="item.part === 'literal' ? 'opacity-50' : SEGMENT"
        >
          {{ item.value }}
        </TimeFieldInput>
      </TimeFieldRoot>
    </span>

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>

<style lang="postcss">
@reference "../../style/main.css";

.poveste-date-calendar {
  @apply bg-gray-50 dark:bg-gray-700 border border-solid border-gray-200 dark:border-gray-850 rounded-sm shadow-md;

  z-index: 100;
}

.poveste-date-step {
  @apply flex p-1 bg-transparent border-0 text-inherit rounded-sm cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-800;
}

.poveste-date-day {
  @apply flex items-center justify-center w-7 h-7 rounded-sm cursor-pointer bg-transparent border-0 text-inherit;

  &[data-outside-view] {
    @apply opacity-30;
  }

  &[data-today] {
    @apply text-primary-500 font-bold;
  }

  &[data-selected] {
    @apply bg-primary-500 text-white;
  }

  &:hover:not([data-selected]) {
    @apply bg-primary-100 dark:bg-primary-800;
  }
}
</style>
