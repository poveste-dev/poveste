import { expect, test } from '@playwright/test'

const PADDED = '4px'

test.describe('wrapper', () => {
  test('applies the global wrapper to a basic story', async ({ page }) => {
    await page.goto('/story/conformance-contrast')

    await expect(page.getByTestId('preview-iframe').contentFrame().locator('.global-wrapper')).toHaveCSS('padding', PADDED)
  })

  test('respects story-level wrapper meta', async ({ page }) => {
    const iframe = page.getByTestId('preview-iframe').contentFrame()

    await page.goto('/story/src-stories-wrappermetaonstory-story-svelte?variantId=src-stories-wrappermetaonstory-story-svelte-1')

    await expect(iframe.getByText('😼')).toBeVisible()
    await expect(iframe.locator('.global-wrapper')).not.toHaveCSS('padding', PADDED)
  })

  test('respects variant-level wrapper meta', async ({ page }) => {
    const iframe = page.getByTestId('preview-iframe').contentFrame()

    await page.goto('/story/src-stories-wrappermetaonvariant-story-svelte?variantId=src-stories-wrappermetaonvariant-story-svelte-0')
    await expect(iframe.getByText('🙀')).toBeVisible()
    await expect(iframe.locator('.global-wrapper')).toHaveCSS('padding', PADDED)

    await page.goto('/story/src-stories-wrappermetaonvariant-story-svelte?variantId=src-stories-wrappermetaonvariant-story-svelte-1')
    await expect(iframe.getByText('😼')).toBeVisible()
    await expect(iframe.locator('.global-wrapper')).not.toHaveCSS('padding', PADDED)
  })
})
