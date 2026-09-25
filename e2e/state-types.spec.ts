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
    const controls = page.getByTestId('story-controls')

    await expect(preview.locator('.conformance-types-date')).toHaveText('1790071200000')

    await controls.locator('.poveste-wrapper').filter({ hasText: 'Label' }).locator('input').fill('edited')
    await expect(preview.locator('.conformance-types-date')).toHaveText('1790071200000')
    await expect(preview.locator('.conformance-types-map')).toHaveText('1')
    await expect(preview.locator('.conformance-types-class')).toHaveText('3')
  })
})
