import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

/*
 * A `Date` in story state arrived on the other side of the sync as `{}` — no
 * error, no warning (#977). The walkers rebuilt every object from its own
 * enumerable keys, and most non-plain types have none, so they were flattened
 * before `postMessage` — which is structured clone, and would have carried
 * every one of them intact.
 *
 * The probes in the story ask each value for something only the real type has.
 * A stringify would not do: `JSON.stringify` flattens a `Map` to `{}` exactly
 * as the broken walker did, and would agree with the defect.
 */
const STORY = 'conformance-state-types'

test.describe('state holding more than plain objects', () => {
  test('keeps its types through the sandbox crossing', async ({ page }) => {
    await openStory(page, STORY)
    const preview = page.getByTestId('preview-iframe').contentFrame()

    await expect(preview.locator('.conformance-types-date')).toHaveText('1790071200000')
    await expect(preview.locator('.conformance-types-map')).toHaveText('1')
    await expect(preview.locator('.conformance-types-set')).toHaveText('3')
    await expect(preview.locator('.conformance-types-regexp')).toHaveText('ab+c')
    await expect(preview.locator('.conformance-types-class')).toHaveText('3')
  })

  // The failure a story author actually meets: the host's copy of the state is
  // what comes back down on the next write, so a type destroyed on the way up
  // is destroyed in the story on the way back.
  test('and keeps them after an unrelated control writes back', async ({ page }) => {
    await openStory(page, STORY)
    const preview = page.getByTestId('preview-iframe').contentFrame()

    await expect(preview.locator('.conformance-types-date')).toHaveText('1790071200000')

    await row(page, 'Label').locator('input').fill('edited')
    await expect(preview.locator('.conformance-types-date')).toHaveText('1790071200000')
    await expect(preview.locator('.conformance-types-map')).toHaveText('1')
    await expect(preview.locator('.conformance-types-class')).toHaveText('3')
  })

  /*
   * The other half of #977, one realm further on. Carrying the types across
   * only moved the question to the panel: it renders anything it cannot switch
   * on as JSON, where a `Date` reads as a quoted ISO string and a `Map` as
   * `{}` — neither distinguishable from a value the reader may edit. Parsing
   * that back wrote a string over the `Date`, and the probe in the story went
   * from its time to `flattened` with nothing said.
   */
  test('and the panel names them rather than showing an editable {}', async ({ page }) => {
    await openStory(page, STORY)
    const preview = page.getByTestId('preview-iframe').contentFrame()

    // Quoted, because the marker takes the value's place in the document and
    // the document is still JSON.
    await expect(row(page, 'at').locator('.cm-content')).toHaveText('"[Date 2026-09-22T10:00:00.000Z]"')
    await expect(row(page, 'm').locator('.cm-content')).toHaveText('"[Map(1)]"')
    await expect(row(page, 're').locator('.cm-content')).toHaveText('"[RegExp /ab+c/gi]"')

    // Named means read-only. The editor refuses the edit outright rather than
    // taking it and writing the label over the value.
    await expect(row(page, 'at').locator('.cm-content')).toHaveAttribute('contenteditable', 'false')
    await expect(row(page, 'at').locator('.poveste-json-read-only')).toBeVisible()

    // And a row the panel can drive is still editable, so the guard cannot
    // pass by turning the whole panel off.
    await expect(row(page, 'Label').locator('input')).toBeEditable()
    await expect(preview.locator('.conformance-types-date')).toHaveText('1790071200000')
  })
})

/** The panel row for one state key, addressed by the title the panel gives it. */
function row(page: Page, key: string) {
  const rows = page.getByTestId('story-controls').locator('.poveste-wrapper')
  return rows.filter({ has: page.getByText(key, { exact: true }) })
}
