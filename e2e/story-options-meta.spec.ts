import { expect, test } from '@playwright/test'

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
