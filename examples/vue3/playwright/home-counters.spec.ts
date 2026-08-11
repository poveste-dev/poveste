import { expect, test } from '@playwright/test'

/*
 * The count-up is a CSS transition on a registered custom property rather than
 * a JS-driven ref, so "does it animate" and "does it end on the right number"
 * are separate questions and both need asserting: a broken `@property`
 * registration still shows the correct total, just instantly.
 */

function countTransitions(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    document.getAnimations().filter(a => 'transitionProperty' in a
      && (a as CSSTransition).transitionProperty === '--poveste-count').length)
}

function counterValues(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.poveste-home-counter-value')]
      .map(el => getComputedStyle(el).getPropertyValue('--poveste-count')))
}

test.describe('home counters', () => {
  test('counts up to the real totals', async ({ page }) => {
    await page.goto('/')

    // The accessible number is the source of truth; the animated one is
    // generated content and must agree with it once it settles.
    const expected = await page.locator('.poveste-home-counter-value ~ .sr-only')
      .allTextContents()
    expect(expected.length).toBe(3)
    expect(expected.every(v => /^\d+$/.test(v))).toBe(true)

    await expect.poll(() => counterValues(page)).toEqual(expected)
  })

  test('animates rather than jumping to the total', async ({ page }) => {
    await page.goto('/')

    // Catching a live transition is the point — if `@property` failed to
    // register, the value would be correct but no transition would exist.
    await expect.poll(() => countTransitions(page), { timeout: 5000 })
      .toBeGreaterThan(0)
  })

  test('exposes each total with its label, and hides the generated number', async ({ page }) => {
    await page.goto('/')

    const group = page.getByRole('group', { name: 'Book contents' })
    await expect(group).toBeVisible()

    // `dl` associates each label with its value; without it these announce as
    // loose fragments, which is what the plain spans used to produce.
    for (const label of ['Stories', 'Variants', 'Documents']) {
      await expect(group.getByRole('term').filter({ hasText: label })).toHaveCount(1)
    }

    // The animated number is generated content and must stay out of the
    // accessibility tree; the real value sits beside it.
    const animated = page.locator('.poveste-home-counter-value')
    await expect(animated).toHaveCount(3)
    for (let i = 0; i < 3; i++) {
      await expect(animated.nth(i)).toHaveAttribute('aria-hidden', 'true')
    }
    await expect(group).toContainText('Stories')
  })

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('lands on the total without animating', async ({ page }) => {
      await page.goto('/')

      const expected = await page.locator('.poveste-home-counter-value ~ .sr-only')
        .allTextContents()
      await expect.poll(() => counterValues(page)).toEqual(expected)
      expect(await countTransitions(page)).toBe(0)
    })
  })
})
