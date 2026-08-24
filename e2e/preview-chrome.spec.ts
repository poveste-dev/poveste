import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

/*
 * `StoryResponsivePreview` frames a single preview: a surface, the reader's
 * background, an optional checkerboard, and padding. A grid cell already paints
 * and pads all of that around the preview, so the preview must not render its
 * own set inside the cell's — doing so stacked a second identical box in the
 * first and doubled the padding (#264). A single view has no such container, so
 * it keeps the whole set (#257 only took the resize furniture).
 */

/** Elements inside `root` painting the chrome's white/gray surface. */
function surfaces(page: Page, root: string) {
  return page.evaluate((selector) => {
    const scope = document.querySelector(selector)
    if (!scope) return -1
    return [...scope.querySelectorAll('*')].filter((el) => {
      const cls = String((el as HTMLElement).className)
      return cls.includes('bg-white') && cls.includes('dark:bg-gray-700')
    }).length
  }, root)
}

function previewBackgrounds(page: Page, root: string) {
  return page.evaluate((selector) => {
    const scope = document.querySelector(selector)
    return scope ? scope.querySelectorAll('[data-testid="responsive-preview-bg"]').length : -1
  }, root)
}

/** Elements inside `root` with padding on any side. */
function paddedElements(page: Page, root: string) {
  return page.evaluate((selector) => {
    const scope = document.querySelector(selector)
    if (!scope) return -1
    return [...scope.querySelectorAll('*')].filter((el) => {
      const style = getComputedStyle(el as HTMLElement)
      return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].some(p => p !== '0px')
    }).length
  }, root)
}

test.describe('a grid cell', () => {
  test('does not stack the preview\'s own surface on its own (#264)', async ({ page }) => {
    await openStory(page, 'conformance-huge-grid')
    await expect(page.getByTestId('preview-iframe').first()).toBeVisible()

    // Scoped to the preview, not the whole cell: the thing #264 fixed is that
    // the preview adds none of its own, and asserting that directly does not
    // depend on how many the grid item around it happens to paint.
    const preview = '.poveste-story-variant-grid-item .poveste-story-responsive-preview'
    expect(await surfaces(page, preview)).toBe(0)
    expect(await previewBackgrounds(page, preview)).toBe(0)
  })

  test('does not add the preview\'s padding on top of its own (#264)', async ({ page }) => {
    await openStory(page, 'conformance-huge-grid')
    await expect(page.getByTestId('preview-iframe').first()).toBeVisible()

    const preview = '.poveste-story-variant-grid-item .poveste-story-responsive-preview'
    expect(await paddedElements(page, preview)).toBe(0)
  })
})

test.describe('a single view', () => {
  // Its container adds none of this, so the preview is where it comes from.
  async function expectChrome(page: Page) {
    const preview = '.poveste-story-responsive-preview'
    await expect(page.locator(preview)).toBeVisible()
    expect(await surfaces(page, preview)).toBeGreaterThan(0)
    expect(await previewBackgrounds(page, preview)).toBe(1)
    expect(await paddedElements(page, preview)).toBeGreaterThan(0)
  }

  test('keeps the preview\'s surface, background and padding', async ({ page }) => {
    await openStory(page, 'conformance-contrast')
    await expectChrome(page)
  })

  // The case gating on `isResponsiveEnabled` would have broken: a single view
  // whose variant is `responsiveDisabled` still needs its chrome — it only
  // loses the draggers. The design-system story is the one that carries the
  // flag, and it is vue3-only.
  test('keeps its chrome even when the variant disables responsive', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('vue3'), 'design-system story is vue3-only')

    await openStory(page, 'tailwind', '?variantId=background-color')
    await expectChrome(page)
  })
})
