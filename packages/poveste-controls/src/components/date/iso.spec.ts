import { CalendarDate, Time } from '@internationalized/date'
import { dateOf, isoOf, timeOf } from './iso.ts'

describe('reading a story\'s value', () => {
  it('takes the date out of a plain day', () => {
    expect(dateOf('2026-09-20')).toEqual(new CalendarDate(2026, 9, 20))
  })

  it('takes the date out of one that carries an hour', () => {
    expect(dateOf('2026-09-20T14:30')).toEqual(new CalendarDate(2026, 9, 20))
  })

  it('refuses a day that does not exist, which the constructor would roll over', () => {
    expect(dateOf('2026-02-30')).toBeUndefined()
    expect(dateOf('2026-13-01')).toBeUndefined()
  })

  it('refuses what is not a date at all', () => {
    expect(dateOf('yesterday')).toBeUndefined()
    expect(dateOf(null)).toBeUndefined()
  })

  it('takes the hour when there is one', () => {
    expect(timeOf('2026-09-20T14:30')).toEqual(new Time(14, 30))
  })

  it('has no hour to take from a plain day', () => {
    expect(timeOf('2026-09-20')).toBeUndefined()
  })

  it('refuses an hour off the clock', () => {
    expect(timeOf('2026-09-20T24:00')).toBeUndefined()
    expect(timeOf('2026-09-20T12:60')).toBeUndefined()
  })
})

describe('writing a story\'s value', () => {
  it('is the day alone when the control shows no hour', () => {
    expect(isoOf(new CalendarDate(2026, 9, 20), new Time(14, 30), false)).toBe('2026-09-20')
  })

  it('pads every part, so it reads back', () => {
    expect(isoOf(new CalendarDate(2026, 1, 5), new Time(9, 7), true)).toBe('2026-01-05T09:07')
  })

  it('is midnight when the control shows an hour and nothing is set', () => {
    expect(isoOf(new CalendarDate(2026, 9, 20), undefined, true)).toBe('2026-09-20T00:00')
  })

  it('is empty with no date, whatever the hour says', () => {
    expect(isoOf(undefined, new Time(14, 30), true)).toBe('')
  })
})
