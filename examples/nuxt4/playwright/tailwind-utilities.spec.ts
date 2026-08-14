import { expect, test } from '@playwright/test'

// `BaseButton.vue` carries `text-red-500`, and this example's whole stylesheet
// is `@import 'tailwindcss'`. That class is the fixture for histoire's
// 10e4927 — "support CSS + retrieve PostCSS config" — and until now nothing
// asserted it, so the only signal that Nuxt's CSS pipeline still reaches
// stories was somebody looking at the book and noticing the button was red.
//
// The isolation pass emits the utility as
//   @layer utilities { @scope (.__poveste-render-story) { .text-red-500 { … } } }
// which has two ways to fail quietly: the utility never arrives in the sandbox
// at all, or it arrives with `--color-red-500` undefined, in which case `color`
// is invalid at computed-value time and the text just inherits.

const RED_500 = /oklch\(0\.637 0\.237 25\.331\)/

test.describe('tailwind utilities in the sandbox', () => {
  test('reach the story, resolving their theme variable', async ({ page }) => {
    await page.goto('/story/app-components-basebutton-story-vue')

    const button = page.frameLocator('iframe[data-test-id="preview-iframe"]').first().locator('button')
    await expect(button).toBeVisible()

    // Asserting the computed colour rather than the class: the class is in the
    // template either way, so `toHaveClass` would pass against a sandbox the
    // stylesheet never reached.
    await expect(button).toHaveCSS('color', RED_500)
  })

  test('defines the theme variable inside the sandbox, not just in the chrome', async ({ page }) => {
    await page.goto('/story/app-components-basebutton-story-vue')
    await expect(page.locator('iframe[data-test-id="preview-iframe"]').first()).toBeVisible()

    const declared = await page.evaluate(async () => {
      const frame = document.querySelector('iframe[data-test-id="preview-iframe"]') as HTMLIFrameElement
      const doc = frame.contentDocument!
      const read = () => getComputedStyle(doc.documentElement).getPropertyValue('--color-red-500')
        || getComputedStyle(doc.body).getPropertyValue('--color-red-500')
      for (let i = 0; i < 60 && !read(); i++) await new Promise(r => setTimeout(r, 100))
      return read().trim()
    })

    expect(declared).not.toBe('')
  })

  test('applies to every variant of a grid, each in its own sandbox', async ({ page }) => {
    await page.goto('/story/app-components-basebutton-story-vue')

    const items = page.locator('.poveste-story-variant-grid-item')
    await expect(items.first()).toBeVisible()

    // A grid cell is its own realm, so the stylesheet has to arrive in each one
    // separately — a regression could easily leave only the first cell styled.
    const colors = await page.evaluate(async () => {
      const cells = [...document.querySelectorAll('.poveste-story-variant-grid-item')]
      const read = () => cells.map((c) => {
        const btn = (c.querySelector('iframe') as HTMLIFrameElement)?.contentDocument?.querySelector('button')
        return btn ? getComputedStyle(btn).color : null
      })
      for (let i = 0; i < 100; i++) {
        const seen = read()
        if (seen.length && seen.every(Boolean)) return seen
        await new Promise(r => setTimeout(r, 100))
      }
      return read()
    })

    expect(colors.length).toBeGreaterThan(1)
    expect(colors.every(c => c && /oklch\(0\.637 0\.237 25\.331\)/.test(c))).toBe(true)
  })
})
