import { expect, test } from '@playwright/test'

// `useScrollOnActive` brings the active story into view when one is opened by
// URL rather than by clicking a visible row. Nothing exercised it, in any book
// or any unit spec, so replacing `scroll-into-view-if-needed` with the platform
// call would have been green either way.
//
// In `e2e/` rather than one book's own directory: it lives in `@poveste/app`,
// so every book renders the same list and the same behaviour. Only the number
// of stories differs, and the viewport below is short enough that each of them
// overflows.
test.describe('the story list', () => {
  test('scrolls the active story into view when it starts below the fold', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 })
    await page.goto('/')

    const list = page.getByRole('navigation', { name: 'Stories' })
    await expect(list.getByRole('link').first()).toBeVisible()

    const scroller = list.locator('.poveste-story-list')

    // Checked rather than assumed: a list that fits needs no scrolling, and the
    // rest of this would pass without proving anything.
    //
    // `quasar` is the one that fits. It carries the conformance contract only —
    // 17 stories in a few folders — so its list is four rows against `vue`'s
    // thirty-nine, and no viewport short enough to overflow it exists: measured
    // at 500, 400, 320 and 260px, `scrollHeight` tracked `clientHeight` exactly
    // every time. Skipped there with that reason rather than quietly passing,
    // and the four books whose lists do overflow exercise the same chrome code.
    const overflows = await scroller.evaluate(el => el.scrollHeight > el.clientHeight + 4)
    test.skip(!overflows, 'this book\'s story list fits without scrolling')

    const links = list.getByRole('link')
    const target = links.nth(await links.count() - 1)
    const href = await target.getAttribute('href')
    expect(href).toBeTruthy()

    expect(await scroller.evaluate(el => el.scrollTop), 'the list starts at the top').toBe(0)

    // By URL, so the row is activated on mount rather than by a click that
    // would have required it to be on screen already.
    await page.goto(href!)
    await expect(list.getByRole('link').first()).toBeVisible()
    await page.waitForTimeout(600)

    expect(await scroller.evaluate(el => el.scrollTop), 'the list scrolled to reach it').toBeGreaterThan(0)
    await expect(list.locator(`[href="${href}"]`), 'and the row is actually on screen').toBeInViewport()
  })
})
