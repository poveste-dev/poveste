import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// The panel's tab row at the widths where its tabs spill into "More" (#1699). The
// menu was anchored to a zero-width wrapper that sat in the flex row after every
// tab, past the window's right edge, so the menu could only open clipped; and a
// tab under More left no visible tab marked as the one showing.
const STORY = 'conformance-button'
const WIDTHS = [900, 1200]

function row(page: Page) {
  return page.locator('.poveste-pane-tabs')
}

for (const width of WIDTHS) {
  test.describe(`pane tabs at ${width} px`, () => {
    test.use({ viewport: { width, height: 800 } })

    test('opens the More menu inside the window', async ({ page }) => {
      await openStory(page, STORY)

      await row(page).getByRole('button', { name: 'More' }).click()
      const menu = page.locator('.poveste-dropdown')
      await expect(menu).toBeVisible()
      await expect(menu.getByRole('link').first()).toBeVisible()

      for (const element of [menu, ...await menu.getByRole('link').all()]) {
        const box = (await element.boundingBox())!
        expect(box.x, 'starts inside the window').toBeGreaterThanOrEqual(0)
        expect(box.x + box.width, 'ends inside the window').toBeLessThanOrEqual(width)
      }
    })

    test('keeps the active tab in the row when it would be under More', async ({ page }) => {
      await openStory(page, STORY, '?tab=events')

      const more = row(page).getByRole('button', { name: 'More' })
      await expect(more, 'the row still overflows at this width').toBeVisible()

      const active = row(page).getByRole('link', { name: 'Events' })
      await expect(active).toBeVisible()
      const tab = (await active.boundingBox())!
      const button = (await more.boundingBox())!
      expect(tab.x + tab.width, 'the More button does not cover it').toBeLessThanOrEqual(button.x)

      // A tab that gave up its place for the active one is in the menu instead, and
      // the active one is not listed twice.
      await more.click()
      const menu = page.locator('.poveste-dropdown')
      await expect(menu.getByRole('link', { name: 'Events' })).toHaveCount(0)
      await expect(menu.getByRole('link')).not.toHaveCount(0)
    })
  })
}
