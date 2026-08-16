import { expect, test } from '@playwright/test'

// A broken `@property` registration still shows the right total, just
// instantly — so the value and the animation need separate assertions.

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

    // The sr-only value is the source of truth. `allTextContents` does not wait
    // for anything, so the count has to be asserted with a locator first.
    const values = page.locator('.poveste-home-counter-value ~ .sr-only')
    await expect(values).toHaveCount(3)
    const expected = await values.allTextContents()
    expect(expected.every(v => /^\d+$/.test(v))).toBe(true)

    await expect.poll(() => counterValues(page)).toEqual(expected)
  })

  test('animates rather than jumping to the total', async ({ page }) => {
    await page.goto('/')

    await expect.poll(() => countTransitions(page), { timeout: 5000 })
      .toBeGreaterThan(0)
  })

  test('exposes each total with its label, and hides the generated number', async ({ page }) => {
    await page.goto('/')

    const group = page.getByRole('group', { name: 'Book contents' })
    await expect(group).toBeVisible()

    for (const label of ['Stories', 'Variants', 'Documents']) {
      await expect(group.getByRole('term').filter({ hasText: label })).toHaveCount(1)
    }

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

      const values = page.locator('.poveste-home-counter-value ~ .sr-only')
      await expect(values).toHaveCount(3)
      await expect.poll(() => counterValues(page)).toEqual(await values.allTextContents())
      expect(await countTransitions(page)).toBe(0)
    })
  })
})
