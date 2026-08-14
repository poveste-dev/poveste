import { expect, test } from '@playwright/test'

// #173. The controls slot renders through the same component as the story body,
// so it carried the same scope-root class and a consumer's page-level rule
// styled Poveste's own panel. Page-level rules stop at the story; the
// consumer's own classes keep working in the panel.

const SLOT = '.__poveste-controls-slot'
const STORY = '/story/src-basebutton-story-svelte?variantId=_default'

test.describe('controls slot isolation', () => {
  test('keeps consumer page-level declarations out of the panel', async ({ page }) => {
    await page.goto(STORY)
    await expect(page.getByTestId('story-controls')).toBeVisible()

    // Separate: losing the marker would leave the rest passing vacuously.
    await expect(page.locator(SLOT)).toHaveCount(1)

    const tokens = await page.evaluate((sel) => {
      const slot = document.querySelector(sel)!
      const s = getComputedStyle(slot)
      return {
        body: s.getPropertyValue('--user-body-token').trim(),
        root: s.getPropertyValue('--user-accent').trim(),
      }
    }, SLOT)

    expect(tokens).toEqual({ body: '', root: '' })
  })

  test('still applies the consumer own classes inside the panel', async ({ page }) => {
    await page.goto(STORY)
    await expect(page.locator(SLOT)).toHaveCount(1)

    // Guards the over-correction: excluding the panel wholesale kills this too.
    const painted = await page.evaluate((sel) => {
      const slot = document.querySelector(sel)
      if (!slot) return null
      const probe = document.createElement('div')
      probe.className = 'user-card'
      slot.append(probe)
      const s = getComputedStyle(probe)
      const out = { bg: s.backgroundColor, border: s.borderTopStyle }
      probe.remove()
      return out
    }, SLOT)

    expect(painted).toEqual({ bg: 'rgb(255, 20, 147)', border: 'dashed' })
  })
})
