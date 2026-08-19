import { expect, test } from '@playwright/test'

// Layout is chrome — the top bar, the panes, the modal — and ran only under
// vue3 (#89). The story-options tests drive `conformance-button`, which the
// contract guarantees has controls.
const CONTROLS_STORY = '/story/conformance-button'

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
    await expect(page.locator('.poveste-base-split-pane').first()).toBeVisible()
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

  test('closes the modal with Escape', async ({ page }) => {
    await page.getByTestId('layout-btn').click()
    await expect(page.getByTestId('layout-modal')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('layout-modal')).toBeHidden()
  })
})
