import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

// Editing a story in a Svelte book was collected and never shown until the page
// was reloaded by hand: story component HMR is off, and nothing in the sandbox
// took the updated module (#1178). A dev-server spec, because only a running
// `poveste dev` delivers the edit.
const STORY_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'stories', 'Demo.story.svelte')
const STORY = '/story/src-stories-demo-story-svelte?variantId=src-stories-demo-story-svelte-0'

test.describe.configure({ mode: 'serial' })

test.describe('editing a story in a Svelte book', () => {
  let original: string

  test.beforeAll(() => {
    original = readFileSync(STORY_FILE, 'utf8')
  })

  test.afterAll(() => {
    writeFileSync(STORY_FILE, original)
  })

  test('reaches the preview without a manual reload', async ({ page }) => {
    await page.goto(STORY)
    const preview = page.getByTestId('preview-iframe').contentFrame()
    await expect(preview.getByText('Hello world!')).toBeVisible()

    // The write is retried as well as the assertion, as in the markdown spec: the
    // watcher has to be up before an edit is delivered at all.
    await expect(async () => {
      writeFileSync(STORY_FILE, original.replace('Hello world!', 'Hello world! EDITED-BY-SPEC'))
      await expect(page.getByTestId('preview-iframe').contentFrame().getByText('EDITED-BY-SPEC')).toBeVisible({ timeout: 5_000 })
    }).toPass({ timeout: 60_000 })
  })
})
