import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from '../../../e2e/support'

/*
 * A SvelteKit 3 project's book, in the built book and in `poveste dev` (#1200).
 * On Kit 3, Kit's plugins kept serving the SvelteKit app in dev and gave the
 * built book relative asset URLs, so `/` was the Kit app and a story deep link
 * loaded `/story/assets/...`. Kit 2 had neither problem only because Kit kept
 * both in a plugin Poveste ignores.
 */

function preview(page: Page) {
  return page.getByTestId('preview-iframe').contentFrame()
}

/** Every response this page gets with a 4xx or 5xx status. */
function failedResponses(page: Page) {
  const failed: string[] = []
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failed.push(`${response.status()} ${response.url()}`)
    }
  })
  return failed
}

test.describe('a SvelteKit 3 book', () => {
  test('is what the root serves, not the SvelteKit app', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('story-list-item').filter({ hasText: 'Badge' })).toBeVisible()
    await expect(page.getByText('Welcome to SvelteKit')).toHaveCount(0)
  })

  test('renders a story from a deep link, with every asset it asks for', async ({ page }) => {
    const failed = failedResponses(page)

    await openStory(page, 'badge', '?variantId=warn')

    await expect(preview(page).locator('.badge-warn')).toHaveText('Careful')
    expect(failed).toEqual([])
  })

  test('resolves a story\'s `#lib` import', async ({ page }) => {
    await openStory(page, 'kit-3', '?variantId=imports')

    await expect(preview(page).getByTestId('greeting')).toHaveText('Hello, SvelteKit 3')
  })

  // `public-assets/`, set as `files.assets` in `sveltekit()`. Kit 3 keeps that
  // option there, and the plugin used to answer `static` over it (#1212).
  test('serves the project\'s assets directory to a story', async ({ page }) => {
    await openStory(page, 'kit-3', '?variantId=static')

    const logo = preview(page).getByTestId('logo')
    await expect(logo).toBeVisible()
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  })

  // The book would not start at all: `theme.favicon` was looked for in `static/`.
  test('finds theme.favicon in that directory', async ({ page }) => {
    await openStory(page, 'kit-3', '?variantId=static')

    await expect(page.locator('link[rel="icon"][href$="logo.svg"]')).toHaveCount(1)
  })
})
