import { expect, test } from '@playwright/test'

// #173. The panel shares the story's scope-root class, so consumer page-level
// rules used to style it. They stop at the story; consumer classes do not.

const SLOT = '.__poveste-controls-slot'
const STORY = '/story/src-basebutton-story-svelte?variantId=_default'

test.describe('controls slot isolation', () => {
  test('keeps consumer page-level declarations out of the panel', async ({ page }) => {
    await page.goto(STORY)
    await expect(page.getByTestId('story-controls')).toBeVisible()

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
