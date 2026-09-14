import { expect, test } from '@playwright/test'
import { sandboxHtml } from './support.js'

const STORY = 'conformance-first-variant'

/**
 * The defect is invisible on a second visit, so every test here gets a fresh
 * context and navigates **once**.
 *
 * `lastSelectedVariant` is recorded on the story object the moment a variant is
 * shown, and it was the only thing that let the guard admit a multi-variant
 * story. So opening this story twice in one context — or asserting after any
 * earlier test in the same page — passes whether the fix is present or not, and
 * a spec written that way would have gone green against the bug (#724).
 */
test.describe('first variant', () => {
  test('renders the first variant on a first visit, with no variant in the URL', async ({ page }) => {
    await page.goto(`/story/${STORY}`)

    await expect(page.locator('.poveste-toolbar-title')).toContainText('First variant', { timeout: 60_000 })
    await expect(sandboxHtml(page)).toContainText('First variant', { timeout: 20_000 })
  })

  // Auto-selection is only useful if it is addressable: `setVariant` does a
  // `router.replace`, so the variant the app picked is linkable and survives a
  // reload rather than being a state only this tab knows about.
  test('puts the variant it picked in the URL', async ({ page }) => {
    await page.goto(`/story/${STORY}`)
    await expect(sandboxHtml(page)).toContainText('First variant', { timeout: 60_000 })

    await expect(page).toHaveURL(/variantId=first/)
  })

  // A variant named in the URL is the reader's choice and must win, or a shared
  // link would open on whatever happens to be first.
  test('leaves a variant named in the URL alone', async ({ page }) => {
    await page.goto(`/story/${STORY}?variantId=second`)

    await expect(sandboxHtml(page)).toContainText('Second variant', { timeout: 60_000 })
  })
})
