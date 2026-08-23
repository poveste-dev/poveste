import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/*
 * Sandbox realm reuse (#240). A grid cell that scrolls into the window is
 * handed to a warm sandbox iframe and retargeted, instead of booting a new
 * document; `layout.isolate` opts a story back into a cold document per render.
 * Either way, what a cell shows must be the variant its header names.
 *
 * Reuse vs reload is told apart on the *document*, not the element: a recycled
 * cell keeps its iframe element either way, but a reload replaces the document
 * inside it and a retarget does not.
 */
const GRID = '.poveste-story-variant-grid .overflow-y-auto'

async function tagDocuments(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLIFrameElement>('[data-testid="preview-iframe"]').forEach((el) => {
      el.contentDocument?.documentElement?.setAttribute('data-reuse-tag', '1')
    })
  })
}

function taggedDocuments(page: Page) {
  return page.evaluate(() => {
    const frames = [...document.querySelectorAll<HTMLIFrameElement>('[data-testid="preview-iframe"]')]
    return frames.filter(el => el.contentDocument?.documentElement?.hasAttribute('data-reuse-tag')).length
  })
}

async function scrollOneViewport(page: Page) {
  await page.evaluate((selector) => {
    const scroller = document.querySelector(selector)
    scroller.scrollTop += scroller.clientHeight
  }, GRID)
}

/** Cells whose button does not say what the header says. */
function mismatchedCells(page: Page, buttonClass: string) {
  return page.evaluate((cls) => {
    return [...document.querySelectorAll('.poveste-story-variant-grid-item')]
      .map((item) => {
        const title = item.querySelector('span.truncate')?.textContent?.trim() ?? ''
        const button = item.querySelector('iframe')?.contentDocument?.querySelector(`.${cls}`)?.textContent?.trim() ?? ''
        return { title, button }
      })
      .filter(({ title, button }) => title.replace('Variant ', '') !== button.replace('Button ', ''))
  }, buttonClass)
}

test.describe('sandbox reuse', () => {
  test('a scrolled grid retargets the documents it has instead of loading new ones', async ({ page }) => {
    await page.goto('/story/conformance-huge-grid')
    const iframes = page.getByTestId('preview-iframe')
    await expect(iframes.first()).toBeVisible()
    await expect.poll(() => mismatchedCells(page, 'conformance-huge-grid-button'), { timeout: 15_000 }).toEqual([])
    await tagDocuments(page)
    // Cells the overscan is still loading have no document to tag yet; the
    // claim is about the ones that do.
    const tagged = await taggedDocuments(page)
    expect(tagged).toBeGreaterThan(0)

    await scrollOneViewport(page)
    await scrollOneViewport(page)
    await expect.poll(() => mismatchedCells(page, 'conformance-huge-grid-button'), { timeout: 15_000 }).toEqual([])

    expect(await taggedDocuments(page), 'every tagged document is still the one in its iframe').toBe(tagged)
  })

  test('layout.isolate reloads the document for every handover', async ({ page }) => {
    await page.goto('/story/src-components-isolatedgrid-story-vue')
    const iframes = page.getByTestId('preview-iframe')
    await expect(iframes.first()).toBeVisible()
    await expect.poll(() => mismatchedCells(page, 'isolated-grid-button'), { timeout: 15_000 }).toEqual([])
    await tagDocuments(page)
    const tagged = await taggedDocuments(page)
    expect(tagged).toBeGreaterThan(0)

    await scrollOneViewport(page)
    await expect.poll(() => mismatchedCells(page, 'isolated-grid-button'), { timeout: 15_000 }).toEqual([])

    // Cells handed a new variant reloaded, so their tagged documents are gone;
    // cells whose variant stayed on screen kept theirs.
    expect(await taggedDocuments(page), 'some cell should have been handed a new variant').toBeLessThan(tagged)
  })
})
