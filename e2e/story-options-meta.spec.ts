import { expect, test } from '@playwright/test'

// Stays per-example: it drives a story whose `meta` forces the options pane
// hidden, and the Svelte plugin has no `meta` prop on Story or Variant, so the
// contract cannot express it (#89).
test.describe('story options meta', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.localStorage.removeItem('_poveste-layout-v1')
    await page.reload()
  })

  test('lets a story force its options pane hidden', async ({ page }) => {
    await page.getByTestId('story-list-item').filter({ hasText: 'StoryOptions Override' }).first().click()
    await expect(page.getByTestId('story-side-panel')).toHaveCount(0)

    // The global setting stays on — only this story opts out.
    await page.getByTestId('story-list-item').filter({ hasText: /^Controls/ }).first().click()
    await expect(page.getByTestId('story-side-panel')).toBeVisible()
  })
})
