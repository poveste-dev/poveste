import { CalendarDate, Time } from '@internationalized/date'

/**
 * A story keeps its state as JSON, so this control's model is an ISO string —
 * `2026-09-20`, or `2026-09-20T14:30` when it shows an hour — rather than one of
 * Reka's `DateValue` objects, which do not survive the trip into a sandbox.
 */

const DATE = /^(\d{4})-(\d{2})-(\d{2})/
const TIME = /[T ](\d{2}):(\d{2})/

export function dateOf(value: string | null | undefined): CalendarDate | undefined {
  const match = DATE.exec(value ?? '')
  if (!match) {
    return undefined
  }

  const date = new CalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
  // `new CalendarDate(2026, 13, 40)` rolls over rather than throwing, so the
  // only way to reject a written-out impossible date is to read it back.
  return date.month === Number(match[2]) && date.day === Number(match[3]) ? date : undefined
}

export function timeOf(value: string | null | undefined): Time | undefined {
  const match = TIME.exec(value ?? '')
  if (!match) {
    return undefined
  }

  const [hour, minute] = [Number(match[1]), Number(match[2])]
  return hour < 24 && minute < 60 ? new Time(hour, minute) : undefined
}

function pad(part: number): string {
  return String(part).padStart(2, '0')
}

/** Minutes, not seconds: the control has no segment finer than that. */
export function isoOf(date: CalendarDate | undefined, time: Time | undefined, withTime: boolean): string {
  if (!date) {
    return ''
  }

  const day = `${pad(date.year).padStart(4, '0')}-${pad(date.month)}-${pad(date.day)}`
  if (!withTime) {
    return day
  }

  const clock = time ?? new Time(0, 0)
  return `${day}T${pad(clock.hour)}:${pad(clock.minute)}`
}
