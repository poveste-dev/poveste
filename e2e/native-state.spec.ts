import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// Poveste renders a story three ways and only two go through a sandbox iframe.
// `layout: { type: 'single', iframe: false }` renders into the host document,
// where `StoryVariantSinglePreviewNative.vue` mentions neither
// `createStateBridge` nor `postMessage`. Every other state spec reaches its
// story through `frameLocator`, so before this one nothing in the shared suite
// ran against that path — which is how emptying the host's `mountStateSync`
// left the vue suite green at 241 specs (#968).
//
// What is asserted here is the part every framework agrees on: the story
// renders into the chrome's own document, and the controls panel and the story
// read the same state in both directions. The part they do not agree on — what
// a variant shows when it was not the one rendered — is `plugin-vue` only, and
// lives in `examples/vue/playwright/native-state-variant-sync.spec.ts` with the
// reason.
const STORY = 'conformance-native-state'

const LABEL = '.conformance-native-label'
const BUMPS = '.conformance-native-bumps'
const BUMP = '.conformance-native-bump'
const RENAME = '.conformance-native-rename'

// Plain page locators, not `frameLocator`: the point of this path is that the
// story shares the chrome's document. A `frameLocator` would pass here by
// finding nothing to assert against.
function control(page: import('@playwright/test').Page) {
  return page.getByTestId('story-controls').locator('input').first()
}

test.describe('native render path state', () => {
  test('renders into the host document with no sandbox iframe', async ({ page }) => {
    await openStory(page, STORY)

    await expect(page.locator(LABEL)).toHaveText('alpha')
    // If this ever finds one, the story stopped exercising the path it exists
    // for and the assertions below are testing the bridge again.
    await expect(page.getByTestId('preview-iframe')).toHaveCount(0)
  })

  test('keeps the controls panel and the story on one state in both directions', async ({ page }) => {
    await openStory(page, STORY)

    // The panel has these at all only because the state reached it, so their
    // value is already the first half of the round trip.
    await expect(control(page)).toHaveValue('alpha')

    await control(page).fill('edited')
    await expect(page.locator(LABEL)).toHaveText('edited')

    await page.locator(RENAME).click()
    await expect(page.locator(LABEL)).toHaveText('from story')
    await expect(control(page)).toHaveValue('from story')

    await page.locator(BUMP).click()
    await expect(page.locator(BUMPS)).toHaveText('1')
  })
})
