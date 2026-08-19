import { expect, test } from '@playwright/test'
import { openDocs } from './support'

// Link handling is markdown rendering, not framework.
const STORY = 'conformance-markdown-links'

test.describe('markdown links', () => {
  test('keeps internal anchor links bare (no target attr)', async ({ page }) => {
    await openDocs(page, STORY)
    const link = page.locator('#link-to-welcome')
    await expect(link).toHaveAttribute('href', '#welcome')
    await expect(link).not.toHaveAttribute('target', /.*/)
  })

  test('opens external links in a new tab', async ({ page }) => {
    await openDocs(page, STORY)
    const link = page.locator('#link-to-history')
    await expect(link).toHaveAttribute('href', 'https://poveste.dev/')
    await expect(link).toHaveAttribute('target', '_blank')
  })
})
