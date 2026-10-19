import { expect, test } from '@playwright/test'

/*
 * The source pane is empty until a story's source loads, and a copy in that
 * window said "Nothing to copy" with the source a moment away (#1314). A Svelte
 * story has no dynamic source, so the pane waits on the static one, which this
 * holds back until the test lets it go.
 */
test('the source pane says it is loading, not that there is nothing, until the source arrives', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  let release!: () => void
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(/__resolved__virtual_story-source_conformance-button-[^/]*\.js$/, async (route) => {
    await released
    await route.continue()
  })

  await page.goto('/story/conformance-button?variantId=default')
  const source = page.locator('.poveste-story-source-code')
  const copy = source.getByRole('button', { name: 'Copy', exact: true })
  await expect(source).toContainText('Loading')

  await copy.click()
  await expect(page.getByRole('status').filter({ hasText: 'Still loading' })).toBeAttached()

  release()
  await expect(source).toContainText('conformance-button')
  await copy.click()
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toBeAttached()
})
