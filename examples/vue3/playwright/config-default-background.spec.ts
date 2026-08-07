import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// The example config sets `defaultBackgroundColor: '#fff'`, which matches the
// built-in "White" preset (the second entry in the dropdown).
const WHITE_PRESET_INDEX = 1

function seedSettings(page: Page, settings: Record<string, unknown>) {
  return page.addInitScript((value) => {
    localStorage.setItem('_poveste-sandbox-settings-v3', JSON.stringify({
      responsiveWidth: 720,
      responsiveHeight: null,
      rotate: false,
      checkerboard: false,
      textDirection: 'ltr',
      ...value,
    }))
  }, settings)
}

test.describe('defaultBackgroundColor', () => {
  test('applies the configured color before any preset is picked', async ({ page }) => {
    await page.goto('/story/src-components-complexparameter-story-vue?variantId=_default')
    await expect(page.getByTestId('responsive-preview-bg')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  })

  test('highlights the matching preset in the dropdown', async ({ page }) => {
    await page.goto('/story/src-components-complexparameter-story-vue?variantId=_default')
    await page.getByTestId('toolbar-background').click()
    const buttons = page.getByTestId('background-popper').locator('> button')
    await expect(buttons.nth(WHITE_PRESET_INDEX)).toHaveClass(/ptw-bg-primary-500/)
    await expect(buttons.nth(0)).not.toHaveClass(/ptw-bg-primary-500/)
  })

  test('keeps a manual pick over the configured default', async ({ page }) => {
    await page.goto('/story/src-components-complexparameter-story-vue?variantId=_default')
    await page.getByTestId('toolbar-background').click()
    await page.getByTestId('background-popper').locator('> button').nth(4).click() // Black
    await expect(page.getByTestId('responsive-preview-bg')).toHaveCSS('background-color', 'rgb(0, 0, 0)')

    await page.reload()
    await expect(page.getByTestId('responsive-preview-bg')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  })

  test('reaches users whose settings predate the option', async ({ page }) => {
    await seedSettings(page, { backgroundColor: '#000' })
    await page.goto('/story/src-components-complexparameter-story-vue?variantId=_default')
    await expect(page.getByTestId('responsive-preview-bg')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  })

  test('never overrides an already picked color', async ({ page }) => {
    await seedSettings(page, { backgroundColor: '#000', backgroundColorPicked: true })
    await page.goto('/story/src-components-complexparameter-story-vue?variantId=_default')
    await expect(page.getByTestId('responsive-preview-bg')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  })
})
