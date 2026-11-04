import { expect, test } from '@playwright/test'

/*
 * `useTemplateRef` is readonly in a dev build, so the sync skips it, and writable
 * in a built one (#959). So this one runs against the built book only, under a
 * binding name that differs from the ref's (#1598).
 *
 * Vue-specific, so it lives here rather than in the shared conformance set.
 */
const STORY = 'conformance-template-ref'

test('a `useTemplateRef` under its own name still holds its element after the state has synced', async ({ page }) => {
  await page.goto(`/story/${STORY}`)
  const read = page.getByTestId('preview-iframe').contentFrame().locator('.conformance-template-ref-read-named')
  await expect(read).toBeVisible({ timeout: 20_000 })
  // No message says the sync has settled. A wait too short can only miss the
  // defect, it can't fail a healthy book.
  await page.waitForTimeout(500)

  await read.click()

  await expect(read).toHaveText('held')
})
