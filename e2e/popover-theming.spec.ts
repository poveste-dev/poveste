import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

/*
 * The `Popover theming` story in the four reference books, and the claim it is
 * there to make: a reader's CSS may name a class the chrome also uses, and must
 * still not reach the chrome.
 *
 * It had no spec, and that cost it. The story named floating-vue's classes
 * because the chrome's menus used to carry them; #918 moved the chrome onto
 * Reka, and the story went on rendering, looking right, and colliding with
 * nothing. Four books demonstrated an isolation that could no longer fail.
 *
 * So this asserts the collision itself. Both halves read the same selector — the
 * reader's popper and the chrome's — which is what binds the story to the class
 * the chrome actually ships: rename it in the chrome and the second half stops
 * finding an element, rather than passing on an empty demonstration.
 */
const STORY = 'isolation-popover-theming'

/** `navy`, which nothing in the chrome is. */
const USER_BACKGROUND = 'rgb(0, 0, 128)'

test('a reader\'s CSS naming the chrome\'s popper class reaches their popper and not ours', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.metadata?.reference, 'demo content of the reference books, not the conformance set')

  await openStory(page, STORY)
  const story = page.getByTestId('preview-iframe').contentFrame()

  await story.locator('.trigger').click()
  const readerPopper = story.locator('.poveste-dropdown')
  await expect(readerPopper).toBeVisible()
  await expect(readerPopper).toHaveCSS('background-color', USER_BACKGROUND)

  await page.getByTestId('toolbar-background').click()
  const chromePopper = page.locator('.poveste-app-root .poveste-dropdown')
  await expect(chromePopper).toBeVisible()
  await expect(chromePopper).not.toHaveCSS('background-color', USER_BACKGROUND)
})
