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
