import { expect, test } from '@playwright/test'

const STORY_URL = '/story/src-components-styleisolation-story-vue?variantId=src-components-styleisolation-story-vue-0'

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
test.describe('style isolation (consumer on Tailwind v4)', () => {
  test('consumer Tailwind utilities apply inside the story', async ({ page }) => {
    await page.goto(STORY_URL)
    const iframe = page.frameLocator('iframe[data-test-id="preview-iframe"]')
    const box = iframe.locator('[data-test-id="consumer-tailwind"]')

    await expect(box).toBeVisible()
    // v4 ships its palette in oklch; this is `bg-red-500`.
    await expect(box).toHaveCSS('background-color', 'oklch(0.637 0.237 25.331)')
    await expect(box).toHaveCSS('padding', '16px')
  })

  test('poveste\'s chrome utilities do not leak into the story', async ({ page }) => {
    await page.goto(STORY_URL)
    const iframe = page.frameLocator('iframe[data-test-id="preview-iframe"]')
    const box = iframe.locator('[data-test-id="chrome-utility-leak"]')

    await expect(box).toBeVisible()
    // `bg-primary-500` styles poveste's own UI; inside a story it must be inert.
    await expect(box).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  })

  test('consumer styles do not leak into poveste\'s chrome', async ({ page }) => {
    await page.goto(STORY_URL)
    await expect(page.getByTestId('story-list-item').first()).toBeVisible()

    // The consumer sets `body { background: tomato }` and `* { box-sizing:
    // content-box }`; neither may reach the surrounding UI.
    await expect(page.locator('body')).not.toHaveCSS('background-color', 'rgb(255, 99, 71)')
    await expect(page.getByTestId('story-list-item').first()).toHaveCSS('box-sizing', 'border-box')
  })

  test('cascade layers from a scoped story stylesheet still apply', async ({ page }) => {
    await page.goto(STORY_URL)
    const iframe = page.frameLocator('iframe[data-test-id="preview-iframe"]')

    // `.my-button` is declared inside `@layer components` in the story's own
    // scoped <style>; layered rules must survive the isolation wrapper.
    await expect(iframe.locator('.my-button')).toHaveCSS('border-color', 'rgb(0, 0, 255)')
  })
})
