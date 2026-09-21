import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// The date control is segments plus a calendar, not an `<input type="date">`, so
// nothing about it is the browser's. What a story gets back is an ISO string,
// and these hold both halves of that: the segments write one, and the calendar
// writes one (#63).
const STORY = 'conformance-date'
const STATE = '.conformance-date-state'

test.describe('date control', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, STORY)
  })

  test('writes a typed year back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const day = page.getByTestId('story-controls').locator('.poveste-wrapper').filter({ hasText: 'Day' })

    await expect(state).toContainText('"day": "2026-09-20"')

    await day.locator('[data-reka-date-field-segment="year"]').click()
    await page.keyboard.type('2031')

    await expect(state).toContainText('"day": "2031-09-20"')
  })

  test('writes a picked day back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const day = page.getByTestId('story-controls').locator('.poveste-wrapper').filter({ hasText: 'Day' })

    await day.getByLabel('Open the calendar').click()
    const calendar = page.locator('.poveste-date-calendar')
    await expect(calendar).toBeVisible()

    // The calendar opens on the month the value is in, so this is 3 September.
    await calendar.locator('[data-reka-calendar-cell-trigger]:not([data-outside-view])').nth(2).click()

    await expect(state).toContainText('"day": "2026-09-03"')
  })

  test('keeps the hour when only the date changes', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const moment = page.getByTestId('story-controls').locator('.poveste-wrapper').filter({ hasText: 'Moment' })

    await expect(state).toContainText('"moment": "2026-09-20T14:30"')

    await moment.locator('[data-reka-date-field-segment="day"]').click()
    await page.keyboard.type('21')

    await expect(state).toContainText('"moment": "2026-09-21T14:30"')
  })

  // An ISO string has nowhere to put an hour until it has a day, so nothing can
  // be written while the value is empty. It used to emit `''` for the attempt,
  // which threw the hour away: pick a date afterwards and it came back midnight,
  // with nothing anywhere saying why (#63).
  test('keeps an hour typed before there is a day to put it in', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const unset = page.getByTestId('story-controls').locator('.poveste-wrapper').filter({ hasText: 'Unset' })

    await expect(state).toContainText('"unset": ""')

    await unset.locator('[data-reka-time-field-segment="hour"]').click()
    await page.keyboard.type('0930')

    await expect(state, 'still nothing to write it into').toContainText('"unset": ""')

    // The day the calendar opens on, which with no value is this month's first.
    await unset.getByLabel('Open the calendar').click()
    await page.locator('.poveste-date-calendar [data-reka-calendar-cell-trigger]:not([data-outside-view])').first().click()

    await expect(state, 'the hour the reader typed, not midnight').toContainText('T09:30')
  })

  test('writes a typed minute back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const moment = page.getByTestId('story-controls').locator('.poveste-wrapper').filter({ hasText: 'Moment' })

    await moment.locator('[data-reka-time-field-segment="minute"]').click()
    await page.keyboard.type('05')

    await expect(state).toContainText('"moment": "2026-09-20T14:05"')
  })
})
