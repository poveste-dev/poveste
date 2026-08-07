import { expect, test } from '@playwright/test'

// The example config sets `head: { meta: [{ name: 'theme-color', content: '#10b981' }] }`.
const themeColor = 'meta[name="theme-color"]'

test.describe('head config', () => {
  test('injects the configured tags into the app', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(themeColor)).toHaveAttribute('content', '#10b981')
  })

  test('injects the configured tags into the sandbox', async ({ page }) => {
    await page.goto('/story/src-components-contrastcolor-story-vue?variantId=_default')
    const iframe = page.frameLocator('iframe[data-test-id="preview-iframe"]')
    await expect(iframe.locator('.contrast-color')).toBeVisible()
    await expect(iframe.locator(themeColor)).toHaveAttribute('content', '#10b981')
  })

  test('does not add a second viewport meta tag', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[name="viewport"]')).toHaveCount(1)
  })
})
