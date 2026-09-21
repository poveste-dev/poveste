import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// The chrome's dropdowns, which #918 moves off floating-vue alongside its
// tooltips. The preset picker stands in for all four: they share one wrapper,
// so what holds here holds for the events panel, the responsive sizes and the
// overflow menu.
//
// What has to survive the swap is not "a panel appears" but where it appears —
// under its trigger, and inside the app root, where the chrome's `@scope`
// boundary reaches it rather than on `body`, where it renders unstyled.
const STORY = 'conformance-button'

test.describe('chrome dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, STORY)
  })

  test('opens under its trigger, inside the app root', async ({ page }) => {
    const trigger = page.getByTestId('toolbar-background')
    await trigger.click()

    const popper = page.locator('.poveste-dropdown')
    await expect(popper).toBeVisible()
    await expect(page.locator('.poveste-app-root .poveste-dropdown')).toHaveCount(1)

    /*
     * Where it is, not only that it is. A popper is anchored by the nearest
     * popper context, and a trigger nested inside a tooltip registers with the
     * tooltip instead — the panel then opens at the corner of the page, hundreds
     * of pixels above the viewport, and every assertion above still passes. It
     * was found by a preset click that could not reach its button.
     */
    const triggerBox = (await trigger.boundingBox())!
    const popperBox = (await popper.boundingBox())!
    const viewport = page.viewportSize()!

    expect(popperBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height)
    expect(popperBox.x).toBeGreaterThanOrEqual(0)
    expect(popperBox.y + popperBox.height).toBeLessThanOrEqual(viewport.height)
  })

  // The trigger was a `<div>` with a click handler, which no key could reach.
  test('opens from the keyboard, which the div it replaced could not', async ({ page }) => {
    await page.getByTestId('toolbar-background').getByRole('button').focus()
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('background-popper')).toBeVisible()
  })

  test('closes on Escape, leaving focus on the trigger', async ({ page }) => {
    const trigger = page.getByTestId('toolbar-background').getByRole('button')
    await trigger.click()
    await expect(page.getByTestId('background-popper')).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(page.getByTestId('background-popper')).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})
