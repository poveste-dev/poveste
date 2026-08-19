import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * The sandbox runs in an iframe, so key events fired while it has focus never
 * reach the parent window. These guard the forwarding that keeps global
 * shortcuts working from inside the preview — chrome behaviour, so it runs
 * under every conformance project (#89).
 */
async function openStoryAndFocusPreview(page: Page) {
  await page.goto('/story/conformance-button')

  const preview = page.getByTestId('preview-iframe').contentFrame()
  await expect(preview.getByText('Click me')).toBeVisible()
  await preview.getByText('Click me').click()

  // Guard against the click silently leaving focus on the parent, which would
  // make the shortcuts below pass for the wrong reason.
  await expect.poll(async () => page.evaluate(() => document.activeElement?.tagName)).toBe('IFRAME')
}

test.describe('shortcuts from the preview iframe', () => {
  test('opens search with ctrl+k while the preview has focus', async ({ page }) => {
    await openStoryAndFocusPreview(page)

    await page.keyboard.press('Control+k')
    await expect(page.getByTestId('search-modal')).toBeVisible()
  })

  // Pinned to light so the assertions can name the state rather than negate
  // whatever it happened to start in — a relative assertion passes even if the
  // shortcut toggles the wrong way.
  test.use({ colorScheme: 'light' })

  test('toggles dark mode with ctrl+shift+d while the preview has focus', async ({ page }) => {
    await openStoryAndFocusPreview(page)
    const isDark = async () => page.locator('html').evaluate(el => el.classList.contains('ptw-dark'))
    await expect.poll(isDark).toBe(false)

    await page.keyboard.press('Control+Shift+D')
    await expect.poll(isDark).toBe(true)

    await page.keyboard.press('Control+Shift+D')
    await expect.poll(isDark).toBe(false)
  })
})
