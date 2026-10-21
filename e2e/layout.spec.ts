import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// The story-options tests need a story with controls, which the contract
// guarantees `conformance-button` has.
const CONTROLS_STORY = '/story/conformance-button'

/** Tab forward from where focus is until `target` has it, as a keyboard reader would. */
async function tabTo(page: Page, target: Locator) {
  await expect(async () => {
    await page.keyboard.press('Tab')
    await expect(target).toBeFocused({ timeout: 50 })
  }).toPass({ intervals: [0], timeout: 10_000 })
}

test.describe('layout customization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.localStorage.removeItem('_poveste-layout-v1')
    await page.reload()
  })

  test('opens the modal from the top bar', async ({ page }) => {
    await page.getByTestId('layout-btn').click()
    await expect(page.getByTestId('layout-modal')).toBeVisible()
    await expect(page.getByTestId('layout-modal')).toContainText('Customize Layout')
  })

  test('toggles the story list', async ({ page }) => {
    // The list itself, not the split pane around it: since #596 the pane is
    // there in both layouts, so it no longer says whether the list is.
    await expect(page.getByTestId('story-list-item').first()).toBeVisible()
    await page.getByTestId('layout-btn').click()
    await page.getByTestId('layout-toggle-story-list').click()
    await page.getByTestId('layout-modal-close').click()
    await expect(page.getByTestId('story-list-item')).toHaveCount(0)
  })

  test('toggles the story options pane', async ({ page }) => {
    await page.goto(CONTROLS_STORY)
    await expect(page.getByTestId('story-side-panel')).toBeVisible()
    await page.getByTestId('layout-btn').click()
    await page.getByTestId('layout-toggle-story-options').click()
    await page.getByTestId('layout-modal-close').click()
    await expect(page.getByTestId('story-side-panel')).toHaveCount(0)
  })

  test('moves the story options pane to the bottom', async ({ page }) => {
    await page.goto(CONTROLS_STORY)
    await expect(page.getByTestId('story-side-panel')).toBeVisible()
    await page.getByTestId('layout-btn').click()
    await page.getByTestId('layout-placement-bottom').click()
    await page.getByTestId('layout-modal-close').click()
    await expect(page.locator('.poveste-base-split-pane.portrait')).toBeVisible()
  })

  test('persists settings across a reload', async ({ page }) => {
    await page.getByTestId('layout-btn').click()
    await page.getByTestId('layout-toggle-story-list').click()
    await page.getByTestId('layout-modal-close').click()
    await page.reload()
    await expect(page.getByTestId('story-list-item')).toHaveCount(0)
  })

  test('hides the layout button on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await expect(page.getByTestId('layout-btn')).toHaveCount(0)
  })

  // The chip and the pane's items were `<a>`s without an href, which are not
  // focusable, so a keyboard reader could not open the pane at all (#1351).
  test('opens with Enter and toggles with Space, reached by Tab alone', async ({ page }) => {
    await expect(page.getByTestId('story-list-item').first()).toBeVisible()

    await tabTo(page, page.getByTestId('layout-btn'))
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('layout-modal')).toBeVisible()
    await tabTo(page, page.getByTestId('layout-toggle-story-list'))
    await page.keyboard.press('Space')
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('story-list-item')).toHaveCount(0)
  })

  // Focus stayed on the chip, behind the pane, and the next Tab went to the top
  // bar (#1372).
  test('is a dialog that takes focus, keeps Tab inside, and gives it back on close', async ({ page }) => {
    const chip = page.getByTestId('layout-btn')
    const dialog = page.getByRole('dialog', { name: 'Customize Layout' })
    const focusIsInside = async () => dialog.evaluate(el => el.contains(document.activeElement))
    await expect(page.getByTestId('story-list-item').first()).toBeVisible()

    await tabTo(page, chip)
    await page.keyboard.press('Enter')
    await expect(dialog).toBeVisible()
    await expect(page.getByTestId('layout-modal-close')).toBeFocused()

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await focusIsInside()).toBe(true)
    }
    await page.keyboard.press('Shift+Tab')
    expect(await focusIsInside()).toBe(true)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(chip).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(dialog).toBeVisible()
    await page.getByTestId('layout-modal-close').click()
    await expect(chip).toBeFocused()
  })

  test('closes the modal with Escape', async ({ page }) => {
    await page.getByTestId('layout-btn').click()
    await expect(page.getByTestId('layout-modal')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('layout-modal')).toBeHidden()
  })
})
