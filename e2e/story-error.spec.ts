import type { Page } from '@playwright/test'
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

/*
 * Resizing is not throwing (#468).
 *
 * A ResizeObserver loop notification reaches `window.onerror` with a null
 * `error`, and the sandbox reported it as the rendering story's crash — so
 * selecting a variant in a grid made ten healthy cells claim to have thrown.
 * Same cry-wolf failure the assertions above guard against, arriving from the
 * chrome rather than a story.
 *
 * The notification cannot be provoked on demand — a headless run produced none
 * on the built book or on `poveste dev` — so it is dispatched into a real
 * sandbox realm instead. The single preview, not the grid: one realm, no pooling
 * to make "which iframe" ambiguous, and the claim does not depend on the layout.
 *
 * The second test is what keeps the first honest: dispatching into a listener
 * that had been removed would pass the first one for the wrong reason.
 */
const NOTIFICATION = 'ResizeObserver loop completed with undelivered notifications.'

async function dispatchIntoSandbox(page: Page, real: boolean) {
  const sandbox = page.frames().find(frame => frame.url().includes(`storyId=${THROWING}`))
  expect(sandbox, 'the story is not rendering in a sandbox realm').toBeTruthy()

  await sandbox!.evaluate(({ message, withError }) => {
    window.dispatchEvent(new ErrorEvent('error', { message, error: withError ? new Error(message) : null }))
  }, { message: NOTIFICATION, withError: real })
}

test.describe('a ResizeObserver loop notification in a sandbox', () => {
  test('is not reported as the story throwing', async ({ page }) => {
    await openStory(page, THROWING, '?variantId=healthy')
    await expect(page.getByTestId('preview-iframe')).toBeVisible()

    await dispatchIntoSandbox(page, false)

    await expect(page.locator('[data-testid="story-error"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="variant-error-marker"]')).toHaveCount(0)
  })

  test('is still reported when a component throws that text itself', async ({ page }) => {
    await openStory(page, THROWING, '?variantId=healthy')
    await expect(page.getByTestId('preview-iframe')).toBeVisible()

    await dispatchIntoSandbox(page, true)

    await expect(page.locator('[data-testid="story-error"]')).toBeVisible()
  })
})
