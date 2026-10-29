import { expect, test } from '@playwright/test'

// #1525: a fence marked `twoslash` in a story's markdown docs, in `Demo.story.md`.
test('a `twoslash` fence in markdown docs opens a name\'s type on focus', async ({ page }) => {
  await page.goto('/story/src-components-demo-story-vue?tab=docs')
  const size = page.locator('.twoslash-hover').filter({ has: page.locator('.twoslash-popup-code', { hasText: 'const size: Size' }) })

  await size.focus({ timeout: 60_000 })

  await expect(size.locator('.twoslash-popup-container')).toBeVisible()
  await expect(size.locator('.twoslash-popup-code')).toHaveText('const size: Size')
})
