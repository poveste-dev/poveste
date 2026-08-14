import { expect, test } from '@playwright/test'

// `src/poveste.css` sets `body { background: deeppink; font-family: cursive }`.
// Every other property in that rule reached the story; the background did not,
// because `sandbox.css` forced `html, body { background: transparent
// !important }`. That reset predates the cascade layer it now lives in by four
// years — back then `!important` was how a default won — and an important
// declaration inside a layer beats unlayered normal ones, which is the opposite
// of what the layer is for.
//
// The visible symptom was a content-sized stripe: the story render root took
// the colour, the body could not, so nothing propagated to the canvas.

const PINK = 'rgb(255, 20, 147)'

test.describe('story background', () => {
  test('takes the user page background across the whole sandbox', async ({ page }) => {
    await page.goto('/story/src-basebutton-story-svelte?variantId=_default')

    const frame = page.locator('iframe[data-test-id="preview-iframe"]').first()
    await expect(frame).toBeVisible()

    // The body, not the render root. The render root was painted even before,
    // and asserting it would pass against the stripe this fixes.
    await expect(async () => {
      const bg = await page.evaluate(() => {
        const f = document.querySelector('iframe[data-test-id="preview-iframe"]') as HTMLIFrameElement
        const doc = f?.contentDocument
        return doc ? getComputedStyle(doc.body).backgroundColor : null
      })
      expect(bg).toBe(PINK)
    }).toPass({ timeout: 20_000 })
  })

  test('covers more than the story content, so it reaches the canvas', async ({ page }) => {
    await page.goto('/story/src-basebutton-story-svelte?variantId=_default')
    await expect(page.locator('iframe[data-test-id="preview-iframe"]').first()).toBeVisible()

    // A background that only paints the content box is the bug; painting the
    // body lets it propagate to the canvas and fill the viewport.
    const size = await page.evaluate(async () => {
      const f = document.querySelector('iframe[data-test-id="preview-iframe"]') as HTMLIFrameElement
      for (let i = 0; i < 100; i++) {
        const doc = f?.contentDocument
        const root = doc?.querySelector('.poveste-generic-render-story')
        if (root && doc!.body && getComputedStyle(doc!.body).backgroundColor !== 'rgba(0, 0, 0, 0)') {
          return { frame: f.clientHeight, content: Math.round(root.getBoundingClientRect().height) }
        }
        await new Promise(r => setTimeout(r, 100))
      }
      return null
    })

    expect(size).not.toBeNull()
    expect(size!.frame).toBeGreaterThan(size!.content)
  })
})
