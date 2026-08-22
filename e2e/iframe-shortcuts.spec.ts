import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// Key events in the sandbox iframe never reach the parent window, so global
// shortcuts depend on forwarding. Chrome, so it runs under every project.
async function openStoryAndFocusPreview(page: Page) {
  await openStory(page, 'conformance-button')

  const preview = page.getByTestId('preview-iframe').contentFrame()
  await expect(preview.getByText('Click me')).toBeVisible()
  await preview.getByText('Click me').click()

  // Without this the shortcuts below pass for the wrong reason.
  await expect.poll(async () => page.evaluate(() => document.activeElement?.tagName)).toBe('IFRAME')
}

test.describe('shortcuts from the preview iframe', () => {
  test('opens search with ctrl+k while the preview has focus', async ({ page }) => {
    await openStoryAndFocusPreview(page)

    await page.keyboard.press('Control+k')
    await expect(page.getByTestId('search-modal')).toBeVisible()
  })

  // Pinned so the assertions can name the state; negating the start passes
  // whichever way the shortcut goes.
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
