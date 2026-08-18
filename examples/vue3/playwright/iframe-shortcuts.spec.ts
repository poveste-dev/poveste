import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * The sandbox runs in an iframe, so key events fired while it has focus never
 * reach the parent window. These specs guard the forwarding that keeps global
 * shortcuts working from inside the preview.
 */

async function openDemoAndFocusPreview(page: Page) {
  await page.goto('/')
  await page.getByTestId('story-list-item').filter({ hasText: 'Demo' }).click()
  await page.getByTestId('story-variant-list-item').filter({ hasText: 'untitled' }).click()

  const iframe = page.getByTestId('preview-iframe').contentFrame()
  await expect(iframe.getByText('Hello world!')).toBeVisible()
  await iframe.getByText('Hello world!').click()

  // Guard against the click silently leaving focus on the parent, which would
  // make the shortcuts below pass for the wrong reason.
  await expect.poll(async () => page.evaluate(() => document.activeElement?.tagName)).toBe('IFRAME')
}

test.describe('shortcuts from the preview iframe', () => {
  test('opens search with ctrl+k while the preview has focus', async ({ page }) => {
    await openDemoAndFocusPreview(page)

    await page.keyboard.press('Control+k')
    await expect(page.getByTestId('search-modal')).toBeVisible()
  })

  test('toggles dark mode with ctrl+shift+d while the preview has focus', async ({ page }) => {
    await openDemoAndFocusPreview(page)

    const isDark = async () => page.locator('html').evaluate(el => el.classList.contains('ptw-dark'))
    const wasDark = await isDark()

    await page.keyboard.press('Control+Shift+D')
    await expect.poll(isDark).toBe(!wasDark)

    await page.keyboard.press('Control+Shift+D')
    await expect.poll(isDark).toBe(wasDark)
  })
})
