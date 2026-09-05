import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

/*
 * Sandbox realm reuse (#240), on every framework. A grid cell that scrolls into
 * the window is handed to a warm sandbox iframe and retargeted, instead of
 * booting a new document; `layout.isolate` opts a story back into a cold
 * document per render. The pool is `@poveste/app`, but what a retarget asks of
 * the realm — mount the next variant, run its setup, report ready — is the
 * framework plugin's, so the claim is about the pair.
 *
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

/** Click a story in the sidebar, expanding the folder it sits in if needed. */
async function openStoryInApp(page: Page, title: string) {
  const item = page.locator('[data-testid="story-list-item"]').filter({ has: page.getByText(title, { exact: true }) })
  if (!await item.isVisible()) {
    await page.locator('[data-testid="story-list-folder"] [role="button"]').filter({ hasText: 'Conformance' }).click()
  }
  await item.click()
  await expect(page.locator('.poveste-toolbar-title')).toContainText(title)
}

async function scrollOneViewport(page: Page) {
  await page.evaluate((selector) => {
    const scroller = document.querySelector(selector)
    scroller.scrollTop += scroller.clientHeight
  }, GRID)
}

/** Cells whose rendered element does not name the variant the header names. */
function mismatchedCells(page: Page, elementClass: string) {
  return page.evaluate((cls) => {
    const number = (text: string) => text.replace(/^(Variant|Button) /, '')
    return [...document.querySelectorAll('.poveste-story-variant-grid-item')]
      .filter(item => (item as HTMLElement).offsetParent !== null)
      .map((item) => {
        const title = item.querySelector('span.truncate')?.textContent?.trim() ?? ''
        const rendered = item.querySelector('iframe')?.contentDocument?.querySelector(`.${cls}`)?.textContent?.trim() ?? ''
        return { title, rendered }
      })
      .filter(({ title, rendered }) => number(title) !== number(rendered))
  }, elementClass)
}

async function openGrid(page: Page, id: string, buttonClass: string) {
  await openStory(page, id)
  await expect(page.getByTestId('preview-iframe').first()).toBeVisible()
  await expect.poll(() => mismatchedCells(page, buttonClass), { timeout: 15_000 }).toEqual([])
  await tagDocuments(page)
  // Cells the overscan is still loading have no document to tag yet; the claim
  // is about the ones that do.
  const tagged = await taggedDocuments(page)
  expect(tagged).toBeGreaterThan(0)
  return tagged
}

test.describe('sandbox reuse', () => {
  test('a scrolled grid retargets the documents it has instead of loading new ones', async ({ page }) => {
    const tagged = await openGrid(page, 'conformance-huge-grid', 'conformance-huge-grid-button')

    await scrollOneViewport(page)
    await scrollOneViewport(page)
    await expect.poll(() => mismatchedCells(page, 'conformance-huge-grid-button'), { timeout: 15_000 }).toEqual([])

    expect(await taggedDocuments(page), 'every tagged document is still the one in its iframe').toBe(tagged)
  })

  test('a retargeted cell runs the variant\'s own init-state', async ({ page }) => {
    // The realm booted for one variant and mounted only that one; the variant
    // it is handed next has to get its setup too, or its label renders empty.
    await openGrid(page, 'conformance-grid-state', 'conformance-grid-state-label')

    await scrollOneViewport(page)
    await scrollOneViewport(page)
    await expect.poll(() => mismatchedCells(page, 'conformance-grid-state-label'), { timeout: 15_000 }).toEqual([])
  })

  test('layout.isolate reloads the document for every handover', async ({ page }) => {
    const tagged = await openGrid(page, 'conformance-isolated-grid', 'conformance-isolated-grid-button')

    await scrollOneViewport(page)
    await expect.poll(() => mismatchedCells(page, 'conformance-isolated-grid-button'), { timeout: 15_000 }).toEqual([])

    // Cells handed a new variant reloaded, so their tagged documents are gone;
    // cells whose variant stayed on screen kept theirs.
    expect(await taggedDocuments(page), 'some cell should have been handed a new variant').toBeLessThan(tagged)
  })

  test('a sidebar click retargets the single preview instead of loading a new document', async ({ page }) => {
    // The path a reader actually spends their time on, and the one realm reuse
    // used to miss entirely (#328): the preview sat under a `v-if` on the
    // variant, and a story change nulls that variant between its two route
    // changes, so the component was destroyed before it could retarget.
    await openStory(page, 'conformance-button')
    await expect(page.getByTestId('preview-iframe')).toBeVisible()
    await tagDocuments(page)
    expect(await taggedDocuments(page)).toBe(1)

    await openStoryInApp(page, 'Contrast')
    await expect(page.getByTestId('preview-iframe').contentFrame().locator('.conformance-contrast')).toBeVisible()

    expect(await taggedDocuments(page), 'the preview kept its document across the story change').toBe(1)
  })

  test('a story with no variant selected shows nothing rather than the previous story', async ({ page }) => {
    // The preview outliving the variant is what makes the retarget above
    // possible, and it is also how it goes wrong: a story that auto-selects
    // nothing would otherwise leave the story the reader just left on screen.
    await openStory(page, 'conformance-button')
    await expect(page.getByTestId('preview-iframe')).toBeVisible()
    await tagDocuments(page)

    await openStoryInApp(page, 'Wrapper')
    await expect(page.getByTestId('preview-iframe'), 'the previous story is not left on screen').not.toBeVisible()

    await page.locator('[data-testid="story-variant-list-item"]').first().click()
    await expect(page.getByTestId('preview-iframe').contentFrame().locator('.conformance-wrapper-text')).toBeVisible()
    expect(await taggedDocuments(page), 'the realm survived the detour through no variant').toBe(1)
  })

  test('a cell handed another story shows that story, not the last one', async ({ page }) => {
    await openGrid(page, 'conformance-huge-grid', 'conformance-huge-grid-button')

    // Same variant ids (`v1`…), another story: a slot must not take the id for
    // the variant it already shows. In-app navigation, so the pool survives;
    // the folder starts collapsed in a fresh profile.
    await openStoryInApp(page, 'Isolated grid')
    await expect.poll(() => mismatchedCells(page, 'conformance-isolated-grid-button'), { timeout: 15_000 }).toEqual([])
    await expect(page.getByTestId('preview-iframe').filter({ visible: true }).first()).toBeVisible()
  })
})
