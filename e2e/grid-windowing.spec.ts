import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// #103, run on every framework. The variant grid is `@poveste/app`, but what it
// mounts into each cell is the framework's own renderer, and the height it
// measures comes back across the sandbox bridge — so "the window stays bounded"
// is a claim about the pair, not about the chrome alone.
//
// Two failures, and each one hides the other. The grid never learned an item's
// height, so it divided by a zero row count, produced `Infinitypx` for its
// scroll spacer and stayed at ten items — 990 variants unreachable. Fixing only
// that exposes the original report: the rendered count was a high-water mark
// derived from everything scrolled past, so nothing was ever unmounted.
//
// Reading the count too early reads low, which would pass a bound assertion on
// a broken build — so every count here waits for two equal readings first.
//
// Since #240 cells are pooled: a cell that scrolls out keeps its element and its
// warm sandbox, hidden, until it is handed the next variant, and a cell's
// position on screen is CSS `order`, not DOM order. So "mounted" here means the
// pool, which is still bounded — and anything about *which* variant is where
// reads the screen, not the DOM sequence.
const STORY = 'conformance-huge-grid'
const ITEM = '.poveste-story-variant-grid-item'
const VARIANT_COUNT = 1000

async function settledCount(page: Page): Promise<number> {
  let previous = -1
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500)
    const current = await page.locator(ITEM).count()
    if (current === previous) return current
    previous = current
  }
  return previous
}

async function scrollTo(scroller: Locator, fraction: number) {
  await scroller.evaluate((el, f) => {
    el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) * f)
  }, fraction)
}

async function openGrid(page: Page) {
  await openStory(page, STORY)
  const scroller = page.locator('.poveste-story-variant-grid .overflow-y-auto')
  await expect(scroller).toBeVisible()

  // Every variant has to be reachable. When the height measurement is lost the
  // spacer is never applied and this stays at roughly one viewport.
  await expect.poll(
    () => scroller.evaluate(el => el.scrollHeight),
    { timeout: 30_000, message: 'grid never reserved a scroll extent' },
  ).toBeGreaterThan(20_000)

  return scroller
}

test.describe('variant grid windowing', () => {
  test('reserves the full scroll extent and keeps the mounted set bounded', async ({ page }) => {
    test.setTimeout(180_000)
    const scroller = await openGrid(page)

    const atTop = await settledCount(page)
    expect(atTop).toBeGreaterThan(0)
    expect(atTop).toBeLessThan(60)

    await scrollTo(scroller, 0.5)
    // The report had this at 1000 — every variant scrolled past, all still mounted.
    expect(await settledCount(page)).toBeLessThan(60)

    await scrollTo(scroller, 1)
    expect(await settledCount(page)).toBeLessThan(60)

    // Items that leave the window must leave the working set — unmounted, or
    // parked in the pool — which is what the monotonic counter never did.
    await scrollTo(scroller, 0)
    expect(await settledCount(page)).toBeLessThan(60)
  })

  test('shows the variants the scroll position implies', async ({ page }) => {
    test.setTimeout(180_000)
    const scroller = await openGrid(page)
    await settledCount(page)

    // Guards the translateY offset against the spacer height: if the two ever
    // disagree the grid still scrolls, it just shows the wrong variants.
    // Visual order, not DOM order: cells are pooled and placed with CSS `order`.
    const onScreen = async () => page.evaluate((sel) => {
      const sc = document.querySelector('.poveste-story-variant-grid .overflow-y-auto')!
      const top = sc.getBoundingClientRect().top
      return [...document.querySelectorAll(sel)]
        .map(i => ({ rect: i.getBoundingClientRect(), n: Number(i.querySelector('.truncate')?.textContent?.replace('Variant ', '')) }))
        .filter(({ rect }) => rect.height > 0 && rect.bottom > top)
        .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
        .map(({ n }) => n)
    }, ITEM)
    const firstOnScreen = async () => (await onScreen())[0]

    expect(await firstOnScreen()).toBe(1)

    await scrollTo(scroller, 0.5)
    await settledCount(page)
    const middle = await firstOnScreen()
    expect(middle).toBeGreaterThan(VARIANT_COUNT * 0.45)
    expect(middle).toBeLessThan(VARIANT_COUNT * 0.55)

    await scrollTo(scroller, 1)
    await settledCount(page)
    // The last row has to land at the bottom of the spacer, not short of it.
    await expect.poll(async () => (await onScreen()).at(-1)).toBe(VARIANT_COUNT)
  })
})
