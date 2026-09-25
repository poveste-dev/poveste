import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

/*
 * A story with `initState` and no controls slot gets a control per state key,
 * built by the panel from the state alone. It is the documented alternative to
 * writing a controls slot by hand, and it had no conformance story — so nobody
 * noticed that a Svelte book showed "No controls available" for exactly the
 * story a Vue book gives three controls.
 *
 * The cause is where the state is seeded. The app mounts the current story
 * hidden, and that pass is what fills `variant.state` for the panel to read;
 * `plugin-vue` seeds there, `plugin-svelte` only seeded when a slot was
 * actually rendered — which, with no controls slot, never happens in the app.
 */
const STORY = 'conformance-init-state-controls'

test.describe('a story whose controls come from initState alone', () => {
  test('gets one control per state key, typed by its value', async ({ page }) => {
    await openStory(page, STORY)

    await expect(row(page, 'label').locator('input')).toHaveValue('start')
    await expect(row(page, 'count').locator('input')).toHaveValue('1')
    // `role="checkbox"`, not an `<input>`: the control is Reka's since #955.
    await expect(row(page, 'enabled').getByRole('checkbox')).not.toBeChecked()
  })

  test('and each one reaches the story', async ({ page }) => {
    await openStory(page, STORY)
    const preview = page.getByTestId('preview-iframe').contentFrame()

    await expect(preview.locator('.conformance-init-label')).toHaveText('start')

    await row(page, 'label').locator('input').fill('edited')
    await expect(preview.locator('.conformance-init-label')).toHaveText('edited')

    await row(page, 'enabled').getByRole('checkbox').click()
    await expect(preview.locator('.conformance-init-enabled')).toHaveText('true')
  })
})

/** The panel row for one state key, addressed by the title the panel gives it. */
function row(page: Page, key: string) {
  const rows = page.getByTestId('story-controls').locator('.poveste-wrapper')
  return rows.filter({ has: page.getByText(key, { exact: true }) })
}
