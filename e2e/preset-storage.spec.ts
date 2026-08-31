import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

/*
 * Preset keys are written per variant, so a book with thousands of them used to
 * accumulate two keys of pure defaults for every variant anybody looked at, and
 * nothing prunes them — a renamed variant orphans its keys permanently (#326).
 *
 * Asserted on `localStorage` itself rather than on the panel, because the defect
 * was invisible in the UI: the feature looked and behaved correctly the whole
 * time it was writing.
 */
const STORY = 'conformance-grid'
const VARIANTS = ['one', 'two', 'three']

function presetKeys(page: import('@playwright/test').Page) {
  return page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('_poveste-presets/')))
}

test.describe('preset storage', () => {
  test('writes nothing for variants that are only browsed', async ({ page }) => {
    await openStory(page, STORY)

    for (const variant of VARIANTS) {
      await openStory(page, STORY, `?variantId=${variant}`)
      await expect(page.getByTestId('story-controls')).toBeVisible()
    }

    expect(await presetKeys(page)).toEqual([])
  })

  test('writes the variant\'s keys once a preset is actually created', async ({ page }) => {
    await openStory(page, STORY, '?variantId=one')
    await expect(page.getByTestId('story-controls')).toBeVisible()

    await page.getByTestId('preset-create').click()

    // Creating one also selects it, so both of the variant's keys appear — and
    // only that variant's.
    await expect.poll(async () => (await presetKeys(page)).sort()).toEqual([
      `_poveste-presets/${STORY}:one/selected`,
      `_poveste-presets/${STORY}:one/states`,
    ])
  })

  // The key shape is unchanged, so anything a shipped version already wrote has
  // to keep loading.
  test('still loads a preset written before the page was opened', async ({ page }) => {
    await page.addInitScript(({ story }) => {
      localStorage.setItem(
        `_poveste-presets/${story}:one/states`,
        JSON.stringify([['seeded', { state: {}, label: 'Seeded preset' }]]),
      )
      localStorage.setItem(`_poveste-presets/${story}:one/selected`, 'seeded')
    }, { story: STORY })

    await openStory(page, STORY, '?variantId=one')

    // The closed select shows the selected preset's label, so this is the stored
    // map having been read back rather than the panel's own default.
    await expect(page.getByTestId('story-controls')).toContainText('Seeded preset')
  })
})
