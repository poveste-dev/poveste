import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// `__VUE_PROD_DEVTOOLS__` is forced on in every built book so Vue populates
// `devtoolsRawSetupState`, which `plugin-vue`'s `Story.ts` reads to pull a
// story's `<script setup>` bindings into the variant's state. Nothing covered
// it, so the flag read as an optimisation waiting to be deleted — and #791,
// which drops the devtools *package* from a book, is the shape of change that
// would have taken it along unnoticed.
//
// The crossing is what has to be asserted. A `#controls` template shares the
// story component's scope, so the panel renders `synced` whether or not any of
// this works — measured: with the flag off, the panel still shows `hello`. The
// sandbox is a separate realm and can only be reached through the synced state,
// so driving the *preview* from a control is the assertion that fails when the
// mechanism goes.
//
// Vue-only on purpose: `devtoolsRawSetupState` is Vue core's, so there is
// nothing here for the Svelte books to conform to.
const STORY = '/story/src-components-statesetup-story-vue?variantId=default'

function preview(page: Page) {
  return page.getByTestId('preview-iframe').contentFrame().locator('body')
}

test.describe('state declared in `<script setup>`', () => {
  test('crosses into the sandbox, and a control drives it there', async ({ page }) => {
    await page.goto(STORY)

    // `synced` is a bare `ref()` in `<script setup>`; the story declares no
    // `initState`, so its value reaching the preview is the sync working.
    await expect(preview(page)).toContainText('hello', { timeout: 60_000 })

    await page.locator('.poveste-story-controls').locator('input[type="text"]').last().fill('goodbye')

    await expect(preview(page)).toContainText('goodbye')
  })
})
