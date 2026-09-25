import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// The chrome's resizable boundaries were `div`s with a `mousedown` handler: no
// role, no tabindex, no key handler, so the layout could only be changed with a
// pointer and a screen reader was told nothing was there (#995).
//
// `axe-chrome` passes either way — a div with a mouse handler and no role is not
// a violation, because a pattern that was never attempted is not one (#311). So
// this drives the divider by key instead of auditing it.
test.describe('the chrome panel dividers', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'conformance-controls')
  })

  test('announce themselves as separators with a position', async ({ page }) => {
    const dividers = page.getByRole('separator')
    expect(await dividers.count(), 'the chrome has more than one resizable boundary').toBeGreaterThan(1)

    const first = dividers.first()
    await expect(first).toHaveAttribute('aria-valuenow', /^\d+$/)
    await expect(first).toHaveAttribute('aria-valuemin', /^\d+$/)
    await expect(first).toHaveAttribute('aria-valuemax', /^\d+$/)
    await expect(first).toHaveAttribute('aria-orientation', /^(vertical|horizontal)$/)

    // Named per boundary rather than sharing one label: four of them are on
    // screen at once and they resize different things.
    const labels = await dividers.evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')))
    expect(new Set(labels).size, 'each divider says which boundary it is').toBeGreaterThan(1)
  })

  test('resize from the keyboard, in both directions', async ({ page }) => {
    const divider = page.getByRole('separator').first()
    await divider.focus()
    await expect(divider).toBeFocused()

    const at = async () => Number(await divider.getAttribute('aria-valuenow'))
    const start = await at()

    await page.keyboard.press('PageDown')
    const bigger = await at()
    expect(bigger, 'PageDown moves the boundary').toBeGreaterThan(start)

    await page.keyboard.press('PageUp')
    expect(await at(), 'and PageUp brings it back').toBe(start)

    // The arrows are the fine step, and which pair moves it follows the
    // divider's own orientation.
    const orientation = await divider.getAttribute('aria-orientation')
    await page.keyboard.press(orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown')
    expect(await at(), 'an arrow moves it by one').toBe(start + 1)
  })

  test('stop at the bounds they report', async ({ page }) => {
    const divider = page.getByRole('separator').first()
    await divider.focus()

    await page.keyboard.press('End')
    expect(await divider.getAttribute('aria-valuenow')).toBe(await divider.getAttribute('aria-valuemax'))

    await page.keyboard.press('Home')
    expect(await divider.getAttribute('aria-valuenow')).toBe(await divider.getAttribute('aria-valuemin'))
  })
})
