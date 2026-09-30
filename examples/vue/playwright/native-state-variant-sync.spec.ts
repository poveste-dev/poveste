import { expect, test } from '@playwright/test'

// `plugin-vue` only, which is why it is here rather than in the shared suite.
//
// A Vue story's `<script setup>` bindings are story-level: `Story.ts` builds
// `implicitState` out of what the story exposes, and `mountStateSync` pushes
// that into *every* variant's state, the ones nobody is looking at included.
// Svelte cannot do this and does not try — Svelte 5 dropped `$capture_state`,
// so `RenderStory.svelte` says state belongs to the variant and seeds each one
// from `initState` separately. The same story shape therefore answers this
// question differently in the two books, and a shared spec asserting either
// answer would be wrong in half of them.
//
// The coverage this carries is #968: removing `mountStateSync` leaves the whole
// vue suite green except for this, because it is only observable after a
// variant switch, and the state specs all drive one variant through the sandbox
// bridge. Measured against that removal, this reads `alpha`/`0` — the initial
// values, silently, with nothing logged.
const STORY = '/story/conformance-native-state'

const LABEL = '.conformance-native-label'
const BUMPS = '.conformance-native-bumps'
const BUMP = '.conformance-native-bump'

test.describe('native path variant state sync', () => {
  test('hands a variant the current state when it was not the one rendered', async ({ page }) => {
    await page.goto(STORY)

    const control = page.getByTestId('story-controls').locator('input').first()
    await expect(control).toHaveValue('alpha')

    await page.locator(BUMP).click()
    await control.fill('carried')
    await expect(page.locator(LABEL)).toHaveText('carried')
    await expect(page.locator(BUMPS)).toHaveText('1')

    // Beta was never rendered while those writes happened, and arriving at it
    // builds a fresh tree: `GenericRenderStory` is keyed on the variant.
    await page.locator('[data-testid="story-variant-list-item"]').filter({ hasText: 'Beta' }).click()

    await expect(page.locator(LABEL)).toHaveText('carried')
    await expect(page.locator(BUMPS)).toHaveText('1')
    await expect(page.getByTestId('story-controls').locator('input').first()).toHaveValue('carried')
  })
})
