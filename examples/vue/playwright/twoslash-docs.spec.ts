import { expect, test } from '@playwright/test'

// #1525: a fence marked `twoslash` in a story's markdown docs, in `Demo.story.md`.
test('a `twoslash` fence in markdown docs opens a name\'s type from the keyboard', async ({ page }) => {
  await page.goto('/story/src-components-demo-story-vue?tab=docs')
  const block = page.locator('pre.twoslash')
  const size = block.locator('.twoslash-hover').filter({ has: page.locator('.twoslash-popup-code', { hasText: 'const size: Size' }) })

  // The block is the tab stop; `type Size` is its first name and `const size` its second.
  await block.focus({ timeout: 60_000 })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')

  await expect(size).toBeFocused()
  await expect(size.locator('.twoslash-popup-container')).toBeVisible()
  await expect(size.locator('.twoslash-popup-code')).toHaveText('const size: Size')
})
