import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

/*
 * What axe cannot find (#311). An unlabelled `<div>` list of unlabelled `<div>`s
 * looks like ordinary content, not a broken listbox — automated tooling cannot
 * detect a pattern that was never attempted, so fixing every violation in #310
 * would have left the search unusable with a screen reader and the page testing
 * clean.
 *
 * These assertions are therefore on the pattern itself, not on a rule engine.
 */
const STORY = 'conformance-button'

test.describe('the search combobox', () => {
  test('exposes the combobox pattern and tracks the active option', async ({ page }) => {
    await openStory(page, STORY)
    await page.getByTestId('search-btn').click()

    const input = page.getByRole('combobox', { name: /search for stories/i })
    await expect(input).toBeVisible()
    await expect(input).toHaveAttribute('aria-expanded', 'false')

    await input.fill('button')
    const listbox = page.getByRole('listbox', { name: 'Search results' })
    await expect(listbox).toBeVisible()
    await expect(input).toHaveAttribute('aria-expanded', 'true')
    await expect(input).toHaveAttribute('aria-controls', 'poveste-search-results')

    // Arrowing was a purely visual state change before this.
    const first = await input.getAttribute('aria-activedescendant')
    await input.press('ArrowDown')
    await expect.poll(() => input.getAttribute('aria-activedescendant')).not.toBe(first)

    const active = await input.getAttribute('aria-activedescendant')
    await expect(page.locator(`#${active}`)).toHaveAttribute('aria-selected', 'true')
  })

  // `aria-controls` named the listbox unconditionally, but the listbox only
  // exists when there are results — so any query that matched nothing left the
  // combobox pointing at an id that was not in the document.
  test('does not reference a listbox that is not there', async ({ page }) => {
    await openStory(page, STORY)
    await page.getByTestId('search-btn').click()

    const input = page.getByRole('combobox', { name: /search for stories/i })
    await input.fill('zzzzz-no-such-story-zzzzz')

    await expect(page.getByRole('listbox')).toHaveCount(0)
    await expect(input).toHaveAttribute('aria-expanded', 'false')
    await expect(input).not.toHaveAttribute('aria-controls', /./)
  })

  test('announces the result count', async ({ page }) => {
    await openStory(page, STORY)
    await page.getByTestId('search-btn').click()
    await page.getByRole('combobox', { name: /search for stories/i }).fill('button')

    // Filtered: the page also has the announcer's own status region (#827).
    await expect(page.getByRole('status').filter({ hasText: /result/i })).toBeVisible()
  })
})

test.describe('the story list', () => {
  // Clicking rather than navigating by id: a shared story may sit in a collapsed
  // group, and which groups are open differs between books.
  test('marks the open story as the current page', async ({ page }) => {
    await openStory(page, STORY)

    const items = page.locator('[data-testid="story-list-item"] a')
    await items.first().click()

    await expect(page.locator('[data-testid="story-list-item"] a[aria-current="page"]')).toHaveCount(1)
  })

  // The title and the variant-count badge ran together, so the accessible text
  // read "Button2" and was announced "Button two".
  //
  // Asserted positively. A negative "no name ends in a digit" rule cannot tell
  // the defect from a story genuinely titled `LongFile1`, and this book has two
  // of those — so the check is that the count is spoken as words, which only
  // happens when the badge carries its own label.
  test('announces the variant count as words rather than gluing it to the title', async ({ page }) => {
    await openStory(page, STORY)

    await expect(page.getByRole('link', { name: /\d+ variants?$/ }).first()).toBeVisible()
  })
})

/*
 * Each of these was an `<Icon @click>`: an SVG with no role, no name and no tab
 * stop, which axe cannot tell from a picture (#827). Saving and copying also
 * confirmed only by changing a tooltip.
 */
test.describe('the panel actions', () => {
  test('are named buttons a keyboard can focus', async ({ page }) => {
    await openStory(page, 'conformance-grid', '?variantId=one')
    await expect(page.getByTestId('story-controls')).toBeVisible()

    for (const name of ['Create new preset', 'Reset to initial state']) {
      const button = page.getByRole('button', { name, exact: true })
      await button.focus()
      await expect(button).toBeFocused()
    }
    // Nothing to save to while the initial state is selected.
    await expect(page.getByRole('button', { name: 'Save to preset', exact: true })).toBeDisabled()
    await expect(page.locator('.poveste-story-source-code').getByRole('button', { name: 'Copy', exact: true })).toBeVisible()
  })

  test('name the prop an override would be removed from, and leave the control\'s own name alone', async ({ page }) => {
    await openStory(page, 'conformance-auto-props', '?variantId=declared')

    await expect(page.getByRole('button', { name: 'Remove override of label', exact: true })).toBeAttached()
    // Nested inside the control, the action's name was read as part of it:
    // "label Remove override of label".
    await expect(page.getByRole('textbox', { name: 'label', exact: true })).toBeAttached()
    await expect(page.getByRole('checkbox', { name: 'enabled', exact: true })).toBeAttached()
  })

  // A boolean prop's control is a `role="checkbox"` element that toggles on
  // Enter and Space, and the remove action used to sit inside it.
  test('remove a checkbox override from the keyboard without toggling it back', async ({ page }) => {
    await openStory(page, 'conformance-auto-props', '?variantId=declared')
    const remove = page.getByRole('button', { name: 'Remove override of enabled', exact: true })
    await page.getByRole('checkbox', { name: /^enabled/ }).click()
    await expect(remove).toBeEnabled()

    await remove.focus()
    await page.keyboard.press('Space')

    await expect(remove).toBeDisabled()
  })

  test('announce a saved preset', async ({ page }) => {
    await openStory(page, 'conformance-grid', '?variantId=one')
    await page.getByRole('button', { name: 'Create new preset', exact: true }).click()
    await page.keyboard.press('Enter')

    await page.getByRole('button', { name: 'Save to preset', exact: true }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Preset saved' })).toBeAttached()
  })

  test('announce a copy', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openStory(page, STORY, '?variantId=default')

    await page.locator('.poveste-story-source-code').getByRole('button', { name: 'Copy', exact: true }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toBeAttached()
  })
})
