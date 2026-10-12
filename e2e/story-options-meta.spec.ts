import { expect, test } from '@playwright/test'
import { openStory, toggleLayout } from './support.js'

// A story whose `meta` forces the options pane hidden. It lived in the Vue book
// alone while the Svelte plugin dropped a story's `meta`, with a Svelte story
// that claimed the override and did nothing (#1206). It is reference-book demo
// content, not part of the conformance set.
test.describe('story options meta', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.metadata?.reference, 'demo content of the reference books, not the conformance set')
    await page.goto('/')
    await page.localStorage.removeItem('_poveste-layout-v1')
    await page.reload()
  })

  test('lets a story force its options pane hidden', async ({ page }) => {
    await page.getByTestId('story-list-item').filter({ hasText: 'StoryOptions Override' }).first().click()
    // The story has to be on screen first. Asked straight after the click, "no
    // panel" is true of every story for an instant, and a retrying assertion
    // takes that instant: this passed with the override ignored (#1206).
    await expect(page.getByTestId('preview-iframe').contentFrame().getByText('meta.storyOptions: false')).toBeVisible()
    expect(await page.getByTestId('story-side-panel').count()).toBe(0)

    // The global setting stays on — only this story opts out.
    await page.getByTestId('story-list-item').filter({ hasText: /^Controls/ }).first().click()
    await expect(page.getByTestId('story-side-panel')).toBeVisible()
  })
})

// The other direction, which nothing asserted while the docs promised it
// (#1261). A conformance story, so it runs in every conformance book.
test.describe('a story that forces its options pane on', () => {
  test('shows the pane though the reader has turned it off', async ({ page }) => {
    const preview = page.getByTestId('preview-iframe').contentFrame()

    await openStory(page, 'conformance-button')
    await toggleLayout(page, 'story-options')
    // A story that sets nothing follows the reader. Asked once the story is on
    // screen, for the reason given above: "no panel" is true of any story for
    // an instant.
    await openStory(page, 'conformance-first-variant')
    await expect(preview.getByText('First variant')).toBeVisible()
    expect(await page.getByTestId('story-side-panel').count()).toBe(0)

    await openStory(page, 'conformance-story-options-on')
    await expect(preview.getByText('Story options forced on')).toBeVisible()
    await expect(page.getByTestId('story-side-panel')).toBeVisible()
  })
})
