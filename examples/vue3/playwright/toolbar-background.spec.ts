import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    __settingsRequests: number
  }
}

const presets = [
  { name: 'transparent', bg: 'rgba(0, 0, 0, 0)', contrast: 'rgb(51, 51, 51)' },
  { name: 'white', bg: 'rgb(255, 255, 255)', contrast: 'rgb(51, 51, 51)' },
  { name: 'light gray', bg: 'rgb(170, 170, 170)', contrast: 'rgb(0, 0, 0)' },
  { name: 'dark gray', bg: 'rgb(51, 51, 51)', contrast: 'rgb(255, 255, 255)' },
  { name: 'black', bg: 'rgb(0, 0, 0)', contrast: 'rgb(238, 238, 238)' },
  { name: 'custom', bg: 'rgb(202, 255, 245)', contrast: 'rgb(0, 81, 66)' },
]

// Every case picks another preset before its own, so a preview that never
// repaints fails even where the target is the default the page opened on.
// The primer has to differ in both colors: two presets share a contrast color,
// and one that matched would assert nothing.
function primerFor(index: number) {
  return presets.findIndex(p => p.bg !== presets[index].bg && p.contrast !== presets[index].contrast)
}

async function pickPreset(page: Page, index: number) {
  await page.getByTestId('toolbar-background').click()
  const buttons = page.getByTestId('background-popper').locator('> button')
  await expect(buttons).toHaveCount(presets.length)
  await buttons.nth(index).click()
}

test.describe('background color', () => {
  for (const [index, preset] of presets.entries()) {
    const primer = presets[primerFor(index)]

    test(`applies the ${preset.name} preset to inline-rendered stories`, async ({ page }) => {
      await page.goto('/story/src-components-complexparameter-story-vue?variantId=_default')
      const bg = page.getByTestId('responsive-preview-bg')
      const text = page.getByTestId('story-variant-single-view').locator('.native-story')

      await pickPreset(page, primerFor(index))
      await expect(text).toHaveCSS('color', primer.contrast)

      await pickPreset(page, index)
      await expect(bg).toHaveCSS('background-color', preset.bg)
      await expect(text).toHaveCSS('color', preset.contrast)
    })

    test(`applies the ${preset.name} preset to single-iframe stories`, async ({ page }) => {
      await page.goto('/story/src-components-contrastcolor-story-vue?variantId=_default')
      const text = page.frameLocator('iframe[data-test-id="preview-iframe"]').locator('.contrast-color')

      await pickPreset(page, primerFor(index))
      await expect(text).toHaveCSS('color', primer.contrast)

      await pickPreset(page, index)
      await expect(text).toHaveCSS('color', preset.contrast)
    })

    // With CSS isolation on, each grid item renders in its own sandbox iframe,
    // so the story markup lives in the frame and the item contributes its own
    // preview background element on top of the grid-level one.
    test(`applies the ${preset.name} preset to grid-rendered stories`, async ({ page }) => {
      await page.goto('/story/src-components-substory-story-vue?variantId=src-components-substory-story-vue-0')
      const bg = page.getByTestId('responsive-preview-bg').first()
      const frame = page.frameLocator('iframe[data-test-id="preview-iframe"]').first()
      const text = frame.locator('.poveste-generic-render-story .text')

      await pickPreset(page, primerFor(index))
      await expect(text).toHaveCSS('color', primer.contrast)

      await pickPreset(page, index)
      await expect(bg).toHaveCSS('background-color', preset.bg)
      await expect(text).toHaveCSS('color', preset.contrast)
    })
  }

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
})
