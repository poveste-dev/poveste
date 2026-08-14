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
 * Five of the six have been verified to fail with `isolateStyles: false`, so they
 * genuinely exercise the isolation rather than passing incidentally. The sixth
 * ('styles the chrome root itself') is the exception by construction: it guards
 * the wrapper's `html` → `:scope` rewrite, so with no wrapper at all the rule
 * applies natively and the test passes. It can only fail while wrapping is on.
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

  test('paints the story with the consumer\'s body rule, across the whole sandbox', async ({ page }) => {
    await openStory(page)

    // The mirror of the test above: the same `body { background }` that must not
    // reach the chrome must reach the story, and reach all of it.
    //
    // `sandbox.css` sets `html, body { background: transparent }` so the
    // toolbar's background shows through the iframe. That reset carried
    // `!important` from 2022, four years before the cascade layer it now sits
    // in, and an important declaration inside a layer beats unlayered normal
    // ones — inverting the layer whose entire purpose is letting consumer rules
    // win. The tell was a content-sized stripe: the story root took the colour,
    // `body` could not, so nothing propagated to the canvas.
    const measured = await page.evaluate(async ({ tomato }) => {
      const frame = document.querySelector('iframe[data-test-id="preview-iframe"]') as HTMLIFrameElement
      for (let i = 0; i < 100; i++) {
        const doc = frame?.contentDocument
        const root = doc?.querySelector('.__poveste-render-story')
        if (doc && root && getComputedStyle(doc.body).backgroundColor === tomato) {
          return { frame: frame.clientHeight, content: Math.round(root.getBoundingClientRect().height) }
        }
        await new Promise(r => setTimeout(r, 100))
      }
      const doc = frame?.contentDocument
      return { bodyBg: doc ? getComputedStyle(doc.body).backgroundColor : null }
    }, { tomato: CONSUMER_TOMATO })

    expect(measured, 'the story body never took the consumer background').toHaveProperty('frame')
    expect((measured as { frame: number, content: number }).frame)
      .toBeGreaterThan((measured as { frame: number, content: number }).content)
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
