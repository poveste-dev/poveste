import { expect, test } from '@playwright/test'

// Link handling is markdown rendering, not framework: the same renderer serves
// every book, and it only ran under vue3 (#89).
const STORY = '/story/conformance-markdown-links'

// The contract story is a normal story, so its markdown lives in the Docs
// panel rather than being the page.
async function openDocs(page: import('@playwright/test').Page) {
  await page.goto(STORY)
  await page.getByTestId('story-side-panel').getByRole('link', { name: 'Docs' }).click()
}

test.describe('markdown links', () => {
  test('keeps internal anchor links bare (no target attr)', async ({ page }) => {
    await openDocs(page)
    const link = page.locator('#link-to-welcome')
    await expect(link).toHaveAttribute('href', '#welcome')
    await expect(link).not.toHaveAttribute('target', /.*/)
  })

  test('opens external links in a new tab', async ({ page }) => {
    await openDocs(page)
    const link = page.locator('#link-to-history')
    await expect(link).toHaveAttribute('href', 'https://poveste.dev/')
    await expect(link).toHaveAttribute('target', '_blank')
  })
})
