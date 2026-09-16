import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory, sandboxHtml } from './support.js'

// A story-level `setupApp` reached an implicit variant and was dropped the
// moment a story declared explicit ones — Svelte forwarded story props in one
// template branch only, and nothing warned. Vue inherited them all along, so
// this is shared: the contract is that a variant inherits what the story
// declares, whichever plugin renders it (#466).
const STORY = 'conformance-story-setup-app'

/**
 * The attribute is written while the variant mounts, so asserting it against a
 * sandbox that has not rendered yet is a race — and it lost one run in three in
 * `sveltekit`, which is the slowest book to boot. Waiting for the variant's own
 * text first separates "the handler did not run" from "the sandbox was not up",
 * which are the two things this spec must not confuse.
 */
async function renderedVariant(page: Page, text: string) {
  const body = page.getByTestId('preview-iframe').contentFrame().locator('body')
  await expect(body).toContainText(text)
}

test.describe('story-level setupApp', () => {
  test('runs for a variant the story declared explicitly', async ({ page }) => {
    await openStory(page, STORY, '?variantId=first')
    await renderedVariant(page, 'First variant')

    await expect(sandboxHtml(page)).toHaveAttribute('data-story-setup-app', 'ran')
  })

  // The second variant is not a repeat: the handler belongs to the story, so it
  // has to reach every variant rather than only whichever renders first.
  test('runs for each of them, not only the first', async ({ page }) => {
    await openStory(page, STORY, '?variantId=second')
    await renderedVariant(page, 'Second variant')

    await expect(sandboxHtml(page)).toHaveAttribute('data-story-setup-app', 'ran')
  })
})
