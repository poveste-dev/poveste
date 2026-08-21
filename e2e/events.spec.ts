import { expect, test } from '@playwright/test'

// `logEvent` crosses from the story into the app's events panel, and how it gets
// there differs by framework — the sandbox posts it across, the inline path
// calls the store directly. The panel is shared chrome either way, and this had
// no coverage outside vue3.
const STORY = '/story/conformance-events?variantId=default&tab=events'

test.describe('events', () => {
  test('logs each event the story emits', async ({ page }) => {
    await page.goto(STORY)

    const iframe = page.getByTestId('preview-iframe').contentFrame()
    const events = page.getByTestId('event-item')

    await iframe.locator('.conformance-event-button').click()
    await expect(events.filter({ hasText: 'conformance-click' })).toBeVisible()

    // Twice, because a panel that only ever shows the latest looks identical
    // to a working one until the second event arrives.
    await iframe.locator('.conformance-event-button').click()
    await expect(events).toHaveCount(2)

    await iframe.locator('.conformance-event-other').click()
    await expect(events).toHaveCount(3)
    await expect(events.filter({ hasText: 'conformance-other' })).toBeVisible()
  })

  test('shows the payload of an event', async ({ page }) => {
    await page.goto(STORY)

    const iframe = page.getByTestId('preview-iframe').contentFrame()

    await iframe.locator('.conformance-event-button').click()
    await page.getByTestId('event-item').filter({ hasText: 'conformance-click' }).click()
    await expect(page.locator('.v-popper__popper')).toContainText('"source": "button"')
  })
})
