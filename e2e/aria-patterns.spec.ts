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

    await expect(page.getByRole('status')).toContainText(/result/i)
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
