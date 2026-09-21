import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

/*
 * What the preview area does with a story that does not fit it, and what it
 * offers to size — both properties of `StoryResponsivePreview`, which wraps the
 * single view and every iframe grid cell.
 */

/** The nearest ancestor of the rendered story that actually scrolls it. */
function scrollableAncestor(page: Page) {
  return page.evaluate(() => {
    let el: HTMLElement | null = document.querySelector('.__poveste-render-story')
    while (el) {
      const style = getComputedStyle(el)
      if (/auto|scroll/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        return { clientHeight: el.clientHeight, scrollHeight: el.scrollHeight }
      }
      el = el.parentElement
    }
    return null
  })
}

function resizeHandleCount(page: Page, selector: string) {
  return page.evaluate((root) => {
    const scope = document.querySelector(root)
    if (!scope) return -1
    return [...scope.querySelectorAll('*')]
      .filter(el => /resize/.test(getComputedStyle(el).cursor))
      .length
  }, selector)
}

test.describe('preview overflow', () => {
  test('a story taller than the preview can be scrolled to its end (#258)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await openStory(page, 'conformance-tall-story')
    await expect(page.locator('.conformance-tall-story').first()).toBeVisible()

    // Clipping instead of scrolling left the scroll parent with nothing to
    // scroll, so the story below the fold could not be reached at all.
    const scroller = await scrollableAncestor(page)
    expect(scroller, 'the overflowing story has a scrollable ancestor').not.toBeNull()
    expect(scroller!.scrollHeight).toBeGreaterThan(scroller!.clientHeight)

    await page.evaluate(() => {
      let el: HTMLElement | null = document.querySelector('.__poveste-render-story')
      while (el) {
        const style = getComputedStyle(el)
        if (/auto|scroll/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) {
          el.scrollTop = el.scrollHeight
          return
        }
        el = el.parentElement
      }
    })

    await expect(page.locator('.conformance-tall-story-end')).toBeInViewport()
  })

  /*
   * The other half, which had no test and so was traded away for the one above:
   * #259 gave the background box `min-h-full` so a tall story's background
   * reaches the bottom of it, and a percentage height cannot resolve against a
   * parent whose specified height is `auto`. Every `h-full` below it collapsed,
   * and the iframe fell back to 150px — the HTML default for a replaced element
   * with no resolved height. Every story taller than that was clipped, on the
   * screen a reader spends all their time on, for a month (#949).
   */
  test('a story shorter than the preview fills it, rather than a 150px box (#949)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await openStory(page, 'conformance-button')
    await expect(page.getByTestId('preview-iframe')).toBeVisible()

    const box = await page.evaluate(() => {
      const frame = document.querySelector('[data-testid="preview-iframe"]')
      const background = document.querySelector('[data-testid="responsive-preview-bg"]')

      // Summed off the elements rather than assumed. `p-8` is 28px a side here,
      // not the 32 a reader of the class would expect, so a hardcoded gap is
      // both wrong today and stale the day the spacing scale moves.
      let padding = 0
      for (let node = frame?.parentElement; node && node !== background; node = node.parentElement) {
        const style = getComputedStyle(node)
        padding += Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom)
      }

      return {
        padding,
        frame: frame ? frame.getBoundingClientRect().height : 0,
        background: background ? background.getBoundingClientRect().height : 0,
      }
    })

    // Not `> 150`: a story that happens to be 200px tall would pass that while
    // still being sized by nothing. What says it is sized by its container is
    // that it fills the box it sits in, less the padding between them.
    expect(box.background, 'the preview box is not collapsed').toBeGreaterThan(400)
    expect(box.frame, 'the story fills the preview box rather than the iframe default')
      .toBeGreaterThanOrEqual(box.background - box.padding - 1)
  })
})

test.describe('preview resize handles', () => {
  test('a grid cell offers none, since its size is the column and its story (#257)', async ({ page }) => {
    await openStory(page, 'conformance-huge-grid')
    await expect(page.getByTestId('preview-iframe').first()).toBeVisible()

    expect(await resizeHandleCount(page, '.poveste-story-variant-grid-item')).toBe(0)
  })

  test('the single view still offers them', async ({ page }) => {
    await openStory(page, 'conformance-button')
    await expect(page.getByTestId('preview-iframe').first()).toBeVisible()

    // Scoped to the preview: the split pane between the story and the controls
    // has draggers of its own, and counting those would pass this whether or
    // not the preview kept any.
    expect(await resizeHandleCount(page, '.poveste-story-responsive-preview')).toBeGreaterThan(0)
  })
})
