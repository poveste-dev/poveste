import { expect, test } from '@playwright/test'

// #198, run on every framework. The cell is `@poveste/app`, but the height it
// takes is measured inside the sandbox by the framework's own renderer and sent
// back across the bridge — so this is a claim about the pair, not the chrome.
//
// A grid cell's iframe is given `auto-height`, but the height binding was
// an *alternative* to the responsive one — and responsive is on unless a variant
// opts out. So the grid, the only caller passing `auto-height`, always took the
// responsive branch, never received a height, fell back to `h-full` and took
// whatever the row gave it.
//
// The tell is that the size tracked the window rather than the content: the same
// 48px button rendered in a 279px cell here and a ~760px cell on a larger
// display.

const STORY = '/story/conformance-huge-grid'
const ITEM = '.poveste-story-variant-grid-item'

async function cellMetrics(page: import('@playwright/test').Page) {
  return page.evaluate((sel) => {
    const item = document.querySelector(sel) as HTMLElement
    const frame = item.querySelector('iframe') as HTMLIFrameElement
    const content = frame.contentDocument?.querySelector('.__poveste-render-story') as HTMLElement
    return {
      itemHeight: item.clientHeight,
      iframeHeight: frame.clientHeight,
      contentHeight: content ? Math.round(content.getBoundingClientRect().height) : null,
    }
  }, ITEM)
}

test.describe('grid cell height', () => {
  test('follows the story content, not the viewport', async ({ page }) => {
    test.setTimeout(180_000)

    const heights: number[] = []
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1900, height: 1200 },
      { width: 2560, height: 1400 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto(STORY)
      await expect(page.locator(ITEM).first()).toBeVisible()

      // The first report carries 0 — posted before the story renders — and the
      // real one lands a frame later, so wait for the iframe to actually match
      // its content rather than sampling the placeholder.
      await expect.poll(
        async () => {
          const m = await cellMetrics(page)
          return m.contentHeight && m.iframeHeight === m.contentHeight
        },
        { timeout: 30_000, message: 'iframe never took its content height' },
      ).toBe(true)

      const { itemHeight } = await cellMetrics(page)
      heights.push(itemHeight)
    }

    // Same story, three viewports: the cell must not change size.
    expect(new Set(heights).size).toBe(1)
  })

  test('sizes cells whose sandbox has not reported yet', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 1900, height: 1200 })
    await page.goto(STORY)
    await expect(page.locator(ITEM).first()).toBeVisible()
    await expect.poll(
      async () => (await cellMetrics(page)).contentHeight,
      { timeout: 30_000 },
    ).toBeGreaterThan(0)

    // Rows past the first are mounted but still blank. Without a default height
    // they keep falling through to `h-full`, which is what turned a grid of
    // not-yet-loaded variants into a wall of tall empty boxes.
    const spread = await page.evaluate((sel) => {
      const hs = [...document.querySelectorAll(sel)].map(i => (i as HTMLElement).clientHeight)
      return { min: Math.min(...hs), max: Math.max(...hs), count: hs.length }
    }, ITEM)

    expect(spread.count).toBeGreaterThan(1)
    // Identical, not merely close. Sandboxes boot one at a time — the last cell
    // of this story reports ~15s after the first — so a cell that sizes itself
    // only from its own report spends that time at the bare floor while its
    // neighbours are already rendered. Adopting the story's first reported
    // height instead means the grid is the right shape from the first paint.
    expect(spread.max).toBe(spread.min)
    expect(spread.max).toBeLessThan(220)
  })
  test('ignores a stored responsive height', async ({ page }) => {
    test.setTimeout(180_000)
    // The responsive size is for examining one component at a viewport. Applied
    // to every cell it makes the grid unreadable: a stored 600 gave 729px cells
    // holding one small button, which is the shape #198 was filed about — and
    // it persists in localStorage, so it follows you between sessions.
    await page.addInitScript((key) => {
      localStorage.setItem(key, JSON.stringify({
        responsiveWidth: 720,
        responsiveHeight: 600,
        rotate: false,
        backgroundColor: 'transparent',
        backgroundColorPicked: false,
        checkerboard: false,
        textDirection: 'ltr',
        colorScheme: 'light',
      }))
    }, '_poveste-sandbox-settings-v3')

    await page.setViewportSize({ width: 1900, height: 1200 })
    await page.goto(STORY)
    await expect(page.locator(ITEM).first()).toBeVisible()

    await expect.poll(
      async () => {
        const m = await cellMetrics(page)
        return m.contentHeight && m.iframeHeight === m.contentHeight
      },
      { timeout: 30_000, message: 'a stored responsive height overrode the story height' },
    ).toBe(true)

    expect((await cellMetrics(page)).itemHeight).toBeLessThan(220)
  })
})
