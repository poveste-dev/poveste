import { expect, test } from '@playwright/test'

/*
 * The conformance contract (#89, section 4).
 *
 * Story ids are normally derived from file paths, so the same story has a
 * different URL in every framework. Both plugins accept an explicit id, which
 * is what lets one spec drive every framework — each authors its own
 * implementation, the ids stay identical.
 *
 * This spec runs under every conformance project. Eight stories times four
 * frameworks is a lot of files that have to stay in agreement, so drift fails
 * here rather than turning into a shared spec that silently skips.
 */
const CONTRACT = [
  'conformance-button',
  'conformance-grid',
  'conformance-contrast',
  'conformance-docs',
  'conformance-markdown-links',
  'conformance-no-iframe',
  'conformance-events',
  'conformance-wrapper',
]

test.describe('conformance contract', () => {
  for (const id of CONTRACT) {
    test(`provides ${id}`, async ({ page }) => {
      await page.goto(`/story/${id}`)

      await expect(page.locator('.poveste-toolbar-title')).toBeVisible()
    })
  }
})
