import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

declare global {
  interface Window {
    __settingsRequests: number
  }
}

// Chrome, not framework. Drives conformance ids so it runs under every
// project; tier-1 examples therefore keep identical `backgroundPresets`.
const presets = [
  { name: 'transparent', bg: 'rgba(0, 0, 0, 0)', contrast: 'rgb(51, 51, 51)' },
  { name: 'white', bg: 'rgb(255, 255, 255)', contrast: 'rgb(51, 51, 51)' },
  { name: 'light gray', bg: 'rgb(170, 170, 170)', contrast: 'rgb(0, 0, 0)' },
  { name: 'dark gray', bg: 'rgb(51, 51, 51)', contrast: 'rgb(255, 255, 255)' },
  { name: 'black', bg: 'rgb(0, 0, 0)', contrast: 'rgb(238, 238, 238)' },
  { name: 'custom', bg: 'rgb(202, 255, 245)', contrast: 'rgb(0, 81, 66)' },
]

// A primer differing in both colors: two presets share a contrast color, and
// one that matched would assert nothing.
function primerFor(index: number) {
  const primer = presets.findIndex(p => p.bg !== presets[index].bg && p.contrast !== presets[index].contrast)
  if (primer === -1) {
    // One edit away, not hypothetical: transparent and white already match.
    throw new Error(`No preset differs from '${presets[index].name}' in both background and contrast color.`)
  }
  return primer
}

// Arrange, not an assertion: without it the case whose target is the page
// default asserts an already-true state.
async function startFromAnotherPreset(page: Page, index: number, text: Locator) {
  await pickPreset(page, primerFor(index))
  await expect(text).toHaveCSS('color', presets[primerFor(index)].contrast)
}

/*
 * Picking one is an arrange step, and it has a postcondition the app states
 * itself: the handler is `setBackgroundColor(...); hide()`, so a dropdown that
 * is still open means the click never reached the button.
 *
 * It does miss. Under load the popper is repositioned between the moment
 * Playwright judges it settled and the moment the click lands, so the click
 * goes to where the button was — often the color-scheme row above, which is
 * nested and so not one of these buttons, and which does not close the
 * dropdown. Nothing then sets the colour, and the assertion that follows spends
 * its timeout watching the primer it started from (#75).
 *
 * Retrying the pick is not a weaker check: the colour is still asserted below,
 * unchanged. This only insists the click be delivered before that is judged.
 */
async function pickPreset(page: Page, index: number) {
  const trigger = page.getByTestId('toolbar-background')
  const popper = page.getByTestId('background-popper')

  await expect(async () => {
    if (!await popper.isVisible()) {
      await trigger.click()
      await expect(popper).toBeVisible()
    }

    const buttons = popper.locator('> button')
    await expect(buttons).toHaveCount(presets.length)
    await buttons.nth(index).click()

    await expect(popper, 'the preset click did not reach the button').toBeHidden({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })
}

test.describe('background color', () => {
  for (const [index, preset] of presets.entries()) {
    test(`applies the ${preset.name} preset to inline-rendered stories`, async ({ page }) => {
      await openStory(page, 'conformance-no-iframe')
      const bg = page.getByTestId('responsive-preview-bg')
      const text = page.locator('.conformance-inline')

      await startFromAnotherPreset(page, index, text)

      await pickPreset(page, index)
      await expect(bg).toHaveCSS('background-color', preset.bg)
      await expect(text).toHaveCSS('color', preset.contrast)
    })

    test(`applies the ${preset.name} preset to single-iframe stories`, async ({ page }) => {
      await openStory(page, 'conformance-contrast')
      const text = page.getByTestId('preview-iframe').contentFrame().locator('.conformance-contrast')

      await startFromAnotherPreset(page, index, text)

      await pickPreset(page, index)
      await expect(text).toHaveCSS('color', preset.contrast)
    })

    // With CSS isolation on, each grid item renders in its own sandbox iframe,
    // so the story markup lives in the frame and the item contributes its own
    // preview background element on top of the grid-level one.
    test(`applies the ${preset.name} preset to grid-rendered stories`, async ({ page }) => {
      await openStory(page, 'conformance-grid')
      const bg = page.getByTestId('responsive-preview-bg').first()
      const frame = page.getByTestId('preview-iframe').first().contentFrame()
      const text = frame.locator('.conformance-text')

      await startFromAnotherPreset(page, index, text)

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
    await openStory(page, 'conformance-contrast')
    await expect(page.getByTestId('preview-iframe').contentFrame().locator('.conformance-contrast')).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.__settingsRequests)).toBeGreaterThan(0)
  })
})
