import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/*
 * Isolation between poveste's chrome and consumer stories, with the consumer
 * itself on Tailwind v4 (preflight included — see src/poveste.css).
 *
 * This example exists solely to be that consumer. A global preflight is the
 * scenario under test, and the built book merges every story's CSS into one
 * sandbox stylesheet, so the fixture cannot be confined to a single story
 * inside a larger example without ceasing to test the real thing.
 *
 * This is the regression guard for histoire#779 / #791 / #811: with v4 emitting
 * everything into cascade layers, a consumer's Tailwind must style their stories
 * without leaking into poveste's UI, and poveste's UI must not leak into stories.
 *
 * Five have been verified to fail with `isolateStyles: false`, so they genuinely
 * exercise the isolation rather than passing incidentally. Two cannot be checked
 * that way: 'styles the chrome root itself' guards the `html` → `:scope` rewrite,
 * so with no wrapper the rule applies natively; and 'paints the story with the
 * consumer's body rule' was verified against the `!important` it replaced.
 */

const STORY_URL = '/story/src-components-styleisolation-story-vue?variantId=src-components-styleisolation-story-vue-0'

// Computed colours, named so the assertions read as intent rather than digits.
const CONSUMER_RED_500 = 'oklch(0.637 0.237 25.331)' // the consumer's `bg-red-500`
const CONSUMER_TOMATO = 'rgb(255, 99, 71)' // the consumer's `--user-primary`
const STORY_LAYER_BLUE = 'rgb(0, 0, 255)' // `.my-button` in the story's `@layer components`
const TRANSPARENT = 'rgba(0, 0, 0, 0)'
const CHROME_FONT = '"Noto Sans Display", system-ui, sans-serif'

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

  test('paints the story with the consumer\'s body rule', async ({ page }) => {
    await openStory(page)

    // Mirror of the test above: the rule that must not reach the chrome must
    // reach the story. It has to land on `body` rather than only on the story
    // root, because that is what propagates to the canvas and fills the
    // preview. `sandbox.css` keeps the sandbox transparent for the toolbar
    // background, and while that reset was `!important` it beat the consumer.
    await expect(async () => {
      const bodyBg = await page.evaluate(() => {
        const doc = (document.querySelector('iframe[data-test-id="preview-iframe"]') as HTMLIFrameElement)?.contentDocument
        return doc ? getComputedStyle(doc.body).backgroundColor : null
      })
      expect(bodyBg).toBe(CONSUMER_TOMATO)
    }).toPass({ timeout: 15_000 })
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

  test('styles the chrome root itself, not just its descendants', async ({ page }) => {
    await page.goto('/')

    // The chrome's own `html { font-family }` has to survive being wrapped in
    // `@scope`, which means being rewritten to `:scope`. Tailwind v4 keeps
    // `@layer base` as a real cascade layer, so that rule is nested rather than
    // top-level; a wrapper that only rewrites top-level rules leaves it inert
    // and the entire UI silently falls back to the browser's default serif.
    await expect(page.locator('.poveste-app-root')).toHaveCSS('font-family', CHROME_FONT)
    await expect(page.getByTestId('story-list-item').first()).toHaveCSS('font-family', CHROME_FONT)
  })
})
