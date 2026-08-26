import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

/*
 * A component that throws renders as if it worked (#323), on every framework.
 *
 * The error is captured inside the framework that swallowed it — Vue routes a
 * render throw to `console.error` and leaves the template on screen, so it
 * never reaches `window.onerror` — which makes this a claim about the plugin
 * and the app together, not about the chrome alone.
 *
 * The story carries a healthy variant beside the throwing one on purpose. A
 * marker that shows up on a working variant is worse than no marker, because it
 * retrains the reader to ignore it, so both halves are asserted here.
 */

const THROWING = 'conformance-throws'

test.describe('a story whose component throws', () => {
  test('covers the preview with the error instead of its template', async ({ page }) => {
    await openStory(page, THROWING, '?variantId=throwing')

    const error = page.locator('[data-testid="story-error"]')
    await expect(error).toBeVisible()
    await expect(page.locator('[data-testid="story-error-message"]')).toHaveText(
      /component blew up on purpose/,
    )
    await expect(error).toContainText('threw while rendering')
  })

  test('marks the variant that threw, and only that one', async ({ page }) => {
    await openStory(page, THROWING, '?variantId=throwing')
    await expect(page.locator('[data-testid="story-error"]')).toBeVisible()

    const variant = (title: string) =>
      page.locator('[data-testid="story-variant-list-item"]', { hasText: title })

    await expect(variant('throwing').locator('[data-testid="variant-error-marker"]')).toBeVisible()
    await expect(variant('healthy').locator('[data-testid="variant-error-marker"]')).toHaveCount(0)
  })

  test('marks the story in the sidebar', async ({ page }) => {
    await openStory(page, THROWING, '?variantId=throwing')
    await expect(page.locator('[data-testid="story-error"]')).toBeVisible()

    // The tree does not expand to the open story on its own, and a collapsed
    // folder renders no rows at all — so the folder has to be opened before
    // there is anything to carry a marker.
    const folder = page.locator('[data-testid="story-list-folder"]', { hasText: 'Conformance' }).first()
    if (await folder.isVisible()) {
      await folder.click()
    }

    const row = page.locator('[data-testid="story-list-item"]', { hasText: 'Throws' }).first()
    await expect(row.locator('[data-testid="story-error-marker"]')).toBeVisible()
  })

  test('leaves a story that renders unmarked', async ({ page }) => {
    await openStory(page, THROWING, '?variantId=healthy')

    // Selecting the healthy variant must not inherit its sibling's error.
    await expect(page.locator('[data-testid="story-error"]')).toHaveCount(0)
  })
})
