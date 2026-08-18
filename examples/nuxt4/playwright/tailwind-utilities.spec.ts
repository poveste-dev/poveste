import { expect, test } from '@playwright/test'

// `BaseButton.vue` carries `text-red-500` and this example's stylesheet is only
// `@import 'tailwindcss'` — the fixture for Nuxt CSS support (histoire 10e4927),
// previously unasserted. Emitted inside a cascade layer and an `@scope`, it can
// fail by never arriving, or by arriving with its theme variable undefined.

const RED_500 = /oklch\(0\.637 0\.237 25\.331\)/

test.describe('tailwind utilities in the sandbox', () => {
  test('reach the story, resolving their theme variable', async ({ page }) => {
    await page.goto('/story/app-components-basebutton-story-vue')

    const button = page.locator('iframe[data-test-id="preview-iframe"]').first().contentFrame().locator('button')
    await expect(button).toBeVisible()

    // The colour, not the class: the class is in the template regardless.
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
