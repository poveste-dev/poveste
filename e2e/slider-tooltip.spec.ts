import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// The unit specs assert the fraction; this asserts the geometry it resolves to,
// which is the half `calc()` does and jsdom cannot. The regression is a resize:
// the offset this replaced was computed once from `clientWidth` and nothing
// invalidated it, so the tooltip drifted off the thumb (#996).
//
// In `e2e/` since the slider joined the conformance set — it was in one book's
// own directory only because no conformance story rendered a slider.
test.describe('the slider tooltip', () => {
  async function anchorAt(page: import('@playwright/test').Page) {
    const field = page.getByTestId('story-controls').locator('.poveste-slider-field').first()
    await field.locator('.poveste-slider-input').hover()
    await expect(field.locator('.poveste-slider-tooltip-anchor')).toBeAttached()

    return field.evaluate((el) => {
      const anchor = el.querySelector('.poveste-slider-tooltip-anchor') as HTMLElement

      // Resolved rather than parsed: the property is `.75rem`, and
      // `parseFloat` on that reads 0.75.
      const probe = document.createElement('div')
      probe.style.width = 'var(--_poveste-slider-thumb)'
      el.append(probe)
      const thumb = probe.getBoundingClientRect().width
      probe.remove()

      const fraction = Number.parseFloat(getComputedStyle(anchor).getPropertyValue('--_poveste-slider-fraction'))
      const width = el.getBoundingClientRect().width

      return {
        width,
        left: anchor.getBoundingClientRect().left - el.getBoundingClientRect().left,
        // Where the centre of a range thumb actually is at this width.
        expected: (thumb / 2) + ((width - thumb) * fraction),
      }
    })
  }

  test('sits on the thumb, and still does after the panel is resized', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await openStory(page, 'conformance-controls')

    const wide = await anchorAt(page)
    expect(wide.left, 'on the thumb at the width it was laid out in').toBeCloseTo(wide.expected, 0)

    await page.setViewportSize({ width: 800, height: 900 })
    await page.waitForTimeout(250)

    const narrow = await anchorAt(page)
    expect(narrow.width, 'the control really did get narrower').toBeLessThan(wide.width)
    expect(narrow.left, 'still on the thumb after the resize').toBeCloseTo(narrow.expected, 0)
    expect(narrow.left, 'and it moved, rather than staying where it was').not.toBeCloseTo(wide.left, 0)
  })
})
