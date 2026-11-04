import { expect, test } from '@playwright/test'
import { openStory, recordSandboxReady, waitForSandboxReady } from './support.js'

// The state sync wrote null over a story's template ref just after mount, with
// nothing thrown and the element still on the page, so a story that read its ref
// any later got nothing: the Lottie stories drew a blank preview (#1598).
const STORY = 'conformance-template-ref'

test.describe('a template ref in a story', () => {
  test('still holds its element after the state has synced', async ({ page }) => {
    await recordSandboxReady(page)
    await openStory(page, STORY)
    await waitForSandboxReady(page, '_default')
    // No message says the sync has settled. A wait too short can only miss the
    // defect, it can't fail a healthy book.
    await page.waitForTimeout(500)

    const read = page.getByTestId('preview-iframe').contentFrame().locator('.conformance-template-ref-read')
    await read.click()

    await expect(read).toHaveText('held')
  })
})
