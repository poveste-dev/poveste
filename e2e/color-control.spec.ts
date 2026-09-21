import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// An in-page picker rather than `<input type="color">`, which is browser chrome:
// unstyled, different on every platform, and untestable. So the area, the hue
// slider and the hex field are all ours to prove (#63).
const STORY = 'conformance-color'
const STATE = '.conformance-color-state'

test.describe('colour control', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, STORY)
  })

  test('writes a typed hex back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const tint = page.getByTestId('story-controls').locator('.poveste-wrapper').filter({ hasText: 'Tint' })

    await expect(state).toContainText('"tint": "#3366ff"')

    await tint.locator('input').fill('#ff0000')
    await tint.locator('input').press('Enter')

    await expect(state).toContainText('"tint": "#ff0000"')
  })

  test('writes a colour set in the area back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const tint = page.getByTestId('story-controls').locator('.poveste-wrapper').filter({ hasText: 'Tint' })

    await tint.getByLabel('Open the colour picker').click()
    const picker = page.locator('.poveste-color-picker')
    await expect(picker).toBeVisible()

    // Driven from the keyboard rather than by clicking a pixel: the step is a
    // tenth of the channel, so ten of them reach brightness zero exactly, and a
    // picker nobody can operate without a mouse fails here too.
    await picker.locator('.poveste-color-area [role="slider"]').focus()
    for (let step = 0; step < 10; step++) {
      await page.keyboard.press('PageDown')
    }

    await expect(state).toContainText('"tint": "#000000"')
  })

  // The way back. A hex string is three channels and the picker edits four, so
  // reading the picker out of the value on each change dropped whichever channel
  // the colour had stopped expressing — and one drag to the bottom of the area is
  // enough to stop expressing two of them (#63).
  test('comes back the colour it left, through a black the hex cannot describe', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const tint = page.getByTestId('story-controls').locator('.poveste-wrapper').filter({ hasText: 'Tint' })

    await tint.getByLabel('Open the colour picker').click()
    const picker = page.locator('.poveste-color-picker')
    await expect(picker).toBeVisible()

    await picker.locator('.poveste-color-area [role="slider"]').focus()
    for (let step = 0; step < 10; step++) {
      await page.keyboard.press('PageDown')
    }
    await expect(state).toContainText('"tint": "#000000"')

    for (let step = 0; step < 10; step++) {
      await page.keyboard.press('PageUp')
    }

    await expect(state, 'the same ten steps back up land on the same colour').toContainText('"tint": "#3366ff"')
  })

  // Lazily loaded, so the chunk has to arrive in both realms. A dynamic import
  // resolved against the wrong base fails only inside a sandbox, and fails as a
  // control that never appears rather than as an error on the page being read.
  test('arrives in a sandbox, not only in the chrome', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.startsWith('svelte'), 'a built-in control in the default slot does not collect under Svelte')

    const preview = page.getByTestId('preview-iframe').contentFrame()

    await expect(preview.locator('.poveste-color .poveste-color-swatch')).toBeVisible()

    await preview.getByLabel('Open the colour picker').click()
    await expect(preview.locator('.poveste-color-picker')).toBeVisible()
  })

  test('opens the picker into the app root, not the body', async ({ page }) => {
    const tint = page.getByTestId('story-controls').locator('.poveste-wrapper').filter({ hasText: 'Tint' })

    await tint.getByLabel('Open the colour picker').click()

    await expect(page.locator('.poveste-app-root .poveste-color-picker')).toHaveCount(1)
  })
})
