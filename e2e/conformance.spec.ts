import { expect, test } from '@playwright/test'

// Story ids are normally path-derived, so the same story has a different URL
// per framework. Both plugins accept an explicit id, which is what lets one
// spec drive every framework. Drift fails here rather than silently skipping.
const CONTRACT = [
  'conformance-button',
  'conformance-grid',
  'conformance-contrast',
  'conformance-docs',
  'conformance-markdown-links',
  'conformance-no-iframe',
  'conformance-events',
  'conformance-wrapper',
]

test.describe('conformance contract', () => {
  for (const id of CONTRACT) {
    test(`provides ${id}`, async ({ page }) => {
      await page.goto(`/story/${id}`)

      await expect(page.locator('.poveste-toolbar-title')).toBeVisible()
    })
  }
})
