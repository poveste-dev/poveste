import { expect, test } from '@playwright/test'

// #173. `src/poveste.css` is an adversarial fixture: `body { background:
// deeppink; font-family: cursive }`. The controls slot renders through the same
// `GenericRenderStory` component as the story body, so it carried the same
// scope-root class and that rule repainted Poveste's own panel — label, dropdown
// and icon buttons included.
//
// The split is between page-level rules and author-written ones. `body` means
// the author's page, so it stops at the story. A class the author wrote still
// applies in the panel, because that markup is theirs.

const PINK = 'rgb(255, 20, 147)'
const SLOT = '.__poveste-controls-slot'

test.describe('controls slot isolation', () => {
  test('keeps the user page background and font out of the panel', async ({ page }) => {
    await page.goto('/story/src-basebutton-story-svelte?variantId=_default')
    await expect(page.getByTestId('story-controls')).toBeVisible()

    // The marker is what the isolation pass excludes. Asserting it separately
    // because losing the class is the silent way this regresses — the rest of
    // the test would still pass against a panel that simply renders no slot.
    await expect(page.locator(SLOT)).toHaveCount(1)

    const leaked = await page.evaluate(({ pink }) => {
      const panel = document.querySelector('[data-test-id="story-controls"]')
      return [...(panel?.querySelectorAll('*') ?? [])].filter((el) => {
        const s = getComputedStyle(el)
        return s.backgroundColor === pink || /cursive/i.test(s.fontFamily)
      }).length
    }, { pink: PINK })

    expect(leaked).toBe(0)
  })

  test('still applies the user own classes inside the panel', async ({ page }) => {
    await page.goto('/story/src-basebutton-story-svelte?variantId=_default')
    await expect(page.locator(SLOT)).toHaveCount(1)

    // `.user-card` is the author's own rule from the same stylesheet. Excluding
    // the panel wholesale would kill this too, which is the over-correction this
    // guards against.
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

    expect(painted).toEqual({ bg: PINK, border: 'dashed' })
  })
})
