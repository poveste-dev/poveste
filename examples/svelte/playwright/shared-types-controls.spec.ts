import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// A component whose props type is imported from `types.ts` got no controls at all,
// because the reader resolved types only in the file it was reading (#501).
const STORY = '/story/shared-types-controls'

function control(page: Page, prop: string) {
  return page.locator('.poveste-controls-component-props')
    .filter({ hasText: '<SharedTypesBadge>' })
    .locator('.poveste-controls-component-prop-item')
    .filter({ hasText: prop })
}

test.describe('controls for a props type imported from another file', () => {
  test('offer the control each prop`s type calls for', async ({ page }) => {
    await page.goto(STORY)

    await expect(control(page, 'text')).toHaveClass(/(^|\s)poveste-text(\s|$)/, { timeout: 30_000 })
    await expect(control(page, 'count')).toHaveClass(/(^|\s)poveste-number(\s|$)/)
    await expect(control(page, 'active')).toHaveClass(/(^|\s)poveste-checkbox(\s|$)/)
  })

  test('drive the component', async ({ page }) => {
    await page.goto(STORY)

    await control(page, 'text').locator('input').fill('New')

    await expect(page.getByTestId('preview-iframe').contentFrame().locator('.shared-types-badge')).toContainText('New')
  })
})
