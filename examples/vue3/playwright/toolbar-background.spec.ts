import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    __settingsRequests: number
  }
}

const presets = [
  { bg: 'rgba(0, 0, 0, 0)', contrast: 'rgb(51, 51, 51)' }, // Transparent
  { bg: 'rgb(255, 255, 255)', contrast: 'rgb(51, 51, 51)' }, // White
  { bg: 'rgb(170, 170, 170)', contrast: 'rgb(0, 0, 0)' }, // Light gray
  { bg: 'rgb(51, 51, 51)', contrast: 'rgb(255, 255, 255)' }, // Dark gray
  { bg: 'rgb(0, 0, 0)', contrast: 'rgb(238, 238, 238)' }, // Black
  { bg: 'rgb(202, 255, 245)', contrast: 'rgb(0, 81, 66)' }, // Custom gray
]

test.describe('background color', () => {
  test('applies the picked preset to inline-rendered stories', async ({ page }) => {
    await page.goto('/story/src-components-complexparameter-story-vue?variantId=_default')
    await page.getByTestId('toolbar-background').click()
    const buttons = page.getByTestId('background-popper').locator('> button')
    await expect(buttons).toHaveCount(presets.length)

    for (let i = 0; i < presets.length; i++) {
      await buttons.nth(i).click()
      await expect(page.getByTestId('responsive-preview-bg')).toHaveCSS('background-color', presets[i].bg)
      await expect(page.getByTestId('story-variant-single-view').locator('.native-story')).toHaveCSS('color', presets[i].contrast)
      await page.getByTestId('toolbar-background').click()
    }
  })

  test('applies the picked preset to single-iframe stories', async ({ page }) => {
    await page.goto('/story/src-components-contrastcolor-story-vue?variantId=_default')
    await page.getByTestId('toolbar-background').click()
    const buttons = page.getByTestId('background-popper').locator('> button')
    await expect(buttons).toHaveCount(presets.length)

    const iframe = page.frameLocator('iframe[data-test-id="preview-iframe"]')
    for (let i = 0; i < presets.length; i++) {
      await buttons.nth(i).click()
      await expect(iframe.locator('.contrast-color')).toHaveCSS('color', presets[i].contrast)
      await page.getByTestId('toolbar-background').click()
    }
  })

  // The app's own push depends on it seeing the iframe load. The request is the
  // sandbox's guarantee that it gets settings even when that push is missed.
  test('is requested by the sandbox when it boots', async ({ page }) => {
    await page.addInitScript(() => {
      Object.assign(window, { __settingsRequests: 0 })
      window.addEventListener('message', (event) => {
        if (event.data?.type === '__poveste:preview-settings-request') {
          window.__settingsRequests++
        }
      })
    })
    await page.goto('/story/src-components-contrastcolor-story-vue?variantId=_default')
    await expect(page.frameLocator('iframe[data-test-id="preview-iframe"]').locator('.contrast-color')).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.__settingsRequests)).toBeGreaterThan(0)
  })

  test('applies the picked preset to grid-rendered stories', async ({ page }) => {
    await page.goto('/story/src-components-substory-story-vue?variantId=src-components-substory-story-vue-0')
    await page.getByTestId('toolbar-background').click()
    const buttons = page.getByTestId('background-popper').locator('> button')
    await expect(buttons).toHaveCount(presets.length)

    // With CSS isolation on, each grid item renders in its own sandbox iframe,
    // so the story markup lives in the frame and the item contributes its own
    // preview background element on top of the grid-level one.
    const gridItemBg = page.getByTestId('responsive-preview-bg').first()
    const iframe = page.frameLocator('iframe[data-test-id="preview-iframe"]').first()

    for (let i = 0; i < presets.length; i++) {
      await buttons.nth(i).click()
      await expect(gridItemBg).toHaveCSS('background-color', presets[i].bg)
      await expect(iframe.locator('.poveste-generic-render-story .text')).toHaveCSS('color', presets[i].contrast)
      await page.getByTestId('toolbar-background').click()
    }
  })
})
