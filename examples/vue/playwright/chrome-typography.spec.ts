import { expect, test } from '@playwright/test'

/*
 * Guards #102. The chrome's own type scale is declared on `body`, and the
 * stylesheet is wrapped in `@scope`, so those rules only survive if the wrapper
 * maps `body` onto the scoping root. When it does not, every rule still parses
 * and still ships — it simply never matches, and the whole UI silently renders
 * at the browser's default 16px instead of 14px.
 *
 * That is why this asserts a *computed* size rather than the presence of a rule
 * or a class: the failure mode is a rule that is present and inert. The rest of
 * the suite passed throughout the entire time this was broken.
 */

// `body { font-size: .875rem }` above the 640px breakpoint. Playwright's
// default viewport is 1280 wide, so this is the branch under test.
const CHROME_FONT_SIZE = '14px'

test.describe('chrome typography', () => {
  test('applies the chrome type scale to the app root', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.poveste-app-root')).toHaveCSS('font-size', CHROME_FONT_SIZE)
  })

  test('inherits that scale into the story list', async ({ page }) => {
    await page.goto('/')

    // Sidebar items carry no font-size of their own, so this fails the moment
    // the root rule stops matching.
    await expect(page.getByTestId('story-list-item').first()).toHaveCSS('font-size', CHROME_FONT_SIZE)
  })
})
