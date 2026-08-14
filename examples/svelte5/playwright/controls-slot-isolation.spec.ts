import { expect, test } from '@playwright/test'

// #173. The controls slot renders through the same `GenericRenderStory`
// component as the story body, so it carried the same scope-root class, and a
// consumer's page-level rule repainted Poveste's own panel — label styling,
// dropdown and icon buttons included.
//
// The split is between page-level rules and author-written ones. `html`, `body`
// and `:root` mean the consumer's page, so they stop at the story. A class the
// consumer wrote still applies in the panel, because that markup is theirs.
//
// `src/poveste.css` declares only custom properties at page level, so the
// signal here is whether they are set on the panel rather than whether it is
// visibly repainted — the fixture deliberately no longer restyles the book.

const SLOT = '.__poveste-controls-slot'
const STORY = '/story/src-basebutton-story-svelte?variantId=_default'

test.describe('controls slot isolation', () => {
  test('keeps consumer page-level declarations out of the panel', async ({ page }) => {
    await page.goto(STORY)
    await expect(page.getByTestId('story-controls')).toBeVisible()

    // Asserted separately because losing the marker is the silent way this
    // regresses: the rest would still pass against a panel rendering no slot.
    await expect(page.locator(SLOT)).toHaveCount(1)

    const tokens = await page.evaluate((sel) => {
      const slot = document.querySelector(sel)!
      const s = getComputedStyle(slot)
      return {
        body: s.getPropertyValue('--user-body-token').trim(),
        root: s.getPropertyValue('--user-accent').trim(),
      }
    }, SLOT)

    // Set on `body` and `:root` by the consumer; both are rewritten to `:scope`
    // by the isolation pass, and `:scope` used to match this element.
    expect(tokens).toEqual({ body: '', root: '' })
  })

  test('still applies the consumer own classes inside the panel', async ({ page }) => {
    await page.goto(STORY)
    await expect(page.locator(SLOT)).toHaveCount(1)

    // `.user-card` is the consumer's own rule from the same stylesheet.
    // Excluding the panel wholesale would kill this too, which is the
    // over-correction this guards against.
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
