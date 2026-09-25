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
</script>

<template>
  <!-- A div, not the wrapper's default label: a click anywhere in a label moves
       focus to the first labelable thing inside it, which here is the hidden
       input Reka renders for form submission rather than the segment clicked. -->
  <HstWrapper
    tag="div"
    :title="title"
    class="poveste-date"
    data-slot="control"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <span
      class="poveste-date-row"
      data-slot="row"
    >
      <DatePickerRoot
        :model-value="date ?? null"
        @update:model-value="writeDate($event)"
      >
        <DatePickerField
          v-slot="{ segments }"
          class="poveste-date-field"
          data-slot="field"
        >
          <DatePickerInput
            v-for="item of segments"
            :key="item.part"
            :part="item.part"
            :class="item.part === 'literal' ? 'poveste-date-separator' : 'poveste-date-segment'"
            data-slot="segment"
          >
            {{ item.value }}
          </DatePickerInput>
          <DatePickerTrigger
            class="poveste-date-trigger"
            data-slot="trigger"
            aria-label="Open the calendar"
          >
            <Icon
              icon="carbon:calendar"
              class="poveste-date-icon"
            />
          </DatePickerTrigger>
        </DatePickerField>

        <Teleport
          v-if="target"
          :to="target"
        >
          <DatePickerContent
            class="poveste-date-calendar"
            data-slot="calendar"
            :side-offset="6"
          >
            <DatePickerCalendar
              v-slot="{ weekDays, grid }"
              class="poveste-date-calendar-body"
            >
              <DatePickerHeader class="poveste-date-header">
                <DatePickerPrev class="poveste-date-step">
                  <Icon
                    icon="carbon:chevron-left"
                    class="poveste-date-icon"
                  />
                </DatePickerPrev>
                <DatePickerHeading />
                <DatePickerNext class="poveste-date-step">
                  <Icon
                    icon="carbon:chevron-right"
                    class="poveste-date-icon"
                  />
                </DatePickerNext>
              </DatePickerHeader>

              <DatePickerGrid
                v-for="month of grid"
                :key="month.value.toString()"
                class="poveste-date-grid"
              >
                <DatePickerGridHead>
                  <DatePickerGridRow>
                    <DatePickerHeadCell
                      v-for="day of weekDays"
                      :key="day"
                      class="poveste-date-weekday"
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
                        data-slot="day"
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
        class="poveste-date-field"
        data-slot="time"
        @update:model-value="writeTime($event as Time | undefined)"
      >
        <TimeFieldInput
          v-for="item of segments"
          :key="item.part"
          :part="item.part"
          :class="item.part === 'literal' ? 'poveste-date-separator' : 'poveste-date-segment'"
          data-slot="segment"
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
.poveste-date {
  align-items: center;
}

.poveste-date-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
}

.poveste-date-field {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 1px;
  height: 27px;
  padding-inline: .5rem;
  margin-block: -.25rem;
  border: 1px solid rgb(0 0 0 / .25);
  border-radius: var(--radius-sm);

  /* Spelled out on the subject: `.ptw-dark` sits above the `@scope` root, so a
     descendant rule keyed on it never matches from in here (#101). */
  &:where(.ptw-dark, .ptw-dark *) {
    border-color: rgb(255 255 255 / .25);
  }

  &:focus-within {
    border-color: var(--color-primary-500);
  }
}

.poveste-date-segment {
  padding-inline: .125rem;
  border-radius: var(--radius-sm);

  &:focus {
    outline: none;
    background: var(--color-primary-500);
    color: var(--color-white);
  }

  &[data-placeholder] {
    opacity: .5;
  }
}

.poveste-date-separator {
  opacity: .5;
}

.poveste-date-trigger {
  display: flex;
  padding: 0;
  margin-left: .25rem;
  border: 0;
  background: transparent;
  color: inherit;
  opacity: .5;
  cursor: pointer;

  &:hover {
    opacity: 1;
    color: var(--color-primary-500);
  }
}

.poveste-date-icon {
  width: 1rem;
  height: 1rem;
}

.poveste-date-calendar {
  z-index: 100;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  background: var(--color-gray-50);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1);

  &:where(.ptw-dark, .ptw-dark *) {
    border-color: var(--color-gray-850);
    background: var(--color-gray-700);
  }
}

.poveste-date-calendar-body {
  padding: .5rem;
}

.poveste-date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: .5rem;
}

.poveste-date-step {
  display: flex;
  padding: .25rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  cursor: pointer;

  &:hover {
    background: var(--color-primary-100);

    &:where(.ptw-dark, .ptw-dark *) {
      background: var(--color-primary-800);
    }
  }
}

.poveste-date-grid {
  border-collapse: collapse;
}

.poveste-date-weekday {
  width: 1.75rem;
  font-size: .75rem;
  font-weight: 400;
  opacity: .5;
}

.poveste-date-day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  cursor: pointer;

  &[data-outside-view] {
    opacity: .3;
  }

  &[data-today] {
    color: var(--color-primary-500);
    font-weight: 700;
  }

  &:hover:not([data-selected]) {
    background: var(--color-primary-100);

    &:where(.ptw-dark, .ptw-dark *) {
      background: var(--color-primary-800);
    }
  }

  /* After the hover rule and at the same specificity, so a selected day keeps
     its fill while the pointer is over it — which is what the `:not()` in the
     hover rule was for. */
  &[data-selected] {
    background: var(--color-primary-500);
    color: var(--color-white);
  }
}
</style>
