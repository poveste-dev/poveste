import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/*
 * Isolation between poveste's chrome and consumer stories, with the consumer
 * itself on Tailwind v4 (preflight included — see src/poveste.css).
 *
 * This is the regression guard for histoire#779 / #791 / #811: with v4 emitting
 * everything into cascade layers, a consumer's Tailwind must style their stories
 * without leaking into poveste's UI, and poveste's UI must not leak into stories.
 *
 * Every test here has been verified to fail with `isolateStyles: false`, so they
 * genuinely exercise the isolation rather than passing incidentally.
 */

const STORY_URL = '/story/src-components-styleisolation-story-vue?variantId=src-components-styleisolation-story-vue-0'

// Computed colours, named so the assertions read as intent rather than digits.
const CONSUMER_RED_500 = 'oklch(0.637 0.237 25.331)' // the consumer's `bg-red-500`
const CONSUMER_TOMATO = 'rgb(255, 99, 71)' // the consumer's `--user-primary`
const STORY_LAYER_BLUE = 'rgb(0, 0, 255)' // `.my-button` in the story's `@layer components`
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

/** Opens the isolation story and returns its preview frame. */
async function openStory(page: Page) {
  await page.goto(STORY_URL)
  return page.frameLocator('iframe[data-test-id="preview-iframe"]')
}

test.describe('style isolation (consumer on Tailwind v4)', () => {
  test('applies the consumer\'s own Tailwind utilities inside the story', async ({ page }) => {
    const story = await openStory(page)

    const box = story.locator('[data-test-id="consumer-tailwind"]')

    await expect(box).toHaveCSS('background-color', CONSUMER_RED_500)
    await expect(box).toHaveCSS('padding', '16px')
  })

  test('leaves chrome-only utilities inert inside the story', async ({ page }) => {
    const story = await openStory(page)

    // `bg-primary-500` styles poveste's own UI; it must do nothing in here.
    const box = story.locator('[data-test-id="chrome-utility-leak"]')

    await expect(box).toHaveCSS('background-color', TRANSPARENT)
  })

  test('keeps the consumer\'s body rule from repainting the chrome', async ({ page }) => {
    await openStory(page)

    // The consumer sets `body { background: var(--user-primary) }`.
    await expect(page.locator('body')).not.toHaveCSS('background-color', CONSUMER_TOMATO)
  })

  test('keeps the consumer\'s universal selector from resetting the chrome', async ({ page }) => {
    await openStory(page)

    // The consumer sets `* { box-sizing: content-box }`.
    await expect(page.getByTestId('story-list-item').first()).toHaveCSS('box-sizing', 'border-box')
  })

  test('preserves cascade layers declared in the story\'s own stylesheet', async ({ page }) => {
    const story = await openStory(page)

    // `.my-button` lives in `@layer components`; layered rules must survive the
    // isolation wrapper, which is the histoire#811 failure mode.
    await expect(story.locator('.my-button')).toHaveCSS('border-color', STORY_LAYER_BLUE)
  })
})
