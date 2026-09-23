import { expect, test } from '@playwright/test'

// `useScrollOnActive` brings the active story into view when one is opened by
// URL rather than by clicking a visible row. Nothing exercised it, in any book
// or any unit spec, so dropping `scroll-into-view-if-needed` for the platform
// call would have been green either way.
test.describe('the story list', () => {
  test('scrolls the active story into view when it starts below the fold', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 })
    await page.goto('/')

    const list = page.getByRole('navigation', { name: 'Stories' })
    await expect(list.getByRole('link').first()).toBeVisible()

    const scroller = list.locator('.poveste-story-list')

    // A row the viewport cannot be showing: the last one in a list of dozens.
    const links = list.getByRole('link')
    const count = await links.count()
    expect(count, 'the vue book has a list long enough to overflow').toBeGreaterThan(20)

    const target = links.nth(count - 1)
    const href = await target.getAttribute('href')
    expect(href).toBeTruthy()

    const before = await scroller.evaluate(el => el.scrollTop)
    expect(before, 'the list starts at the top').toBe(0)

    // By URL, so the row is activated on mount rather than by a click that
    // would have required it to be on screen already.
    await page.goto(href!)
    await expect(page.getByTestId('story-controls').or(page.getByTestId('preview-iframe')).first()).toBeVisible()
    await page.waitForTimeout(600)

    const after = await scroller.evaluate(el => el.scrollTop)
    expect(after, 'the list scrolled to reach it').toBeGreaterThan(0)

    // And it is actually on screen, not merely scrolled somewhere.
    const active = list.locator(`[href="${href}"]`)
    await expect(active).toBeInViewport()
  })
})
