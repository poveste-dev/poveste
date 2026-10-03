import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

// Editing a story in a Nuxt book left its preview throwing "Identifier
// '__povesteTolerant' has already been declared" until the server restarted: Nuxt
// regenerates its plugin templates on the edit and the tolerant wrap ran twice
// (#1177). A dev-server spec, because only a running `poveste dev` regenerates.
const STORY_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'components', 'Simple.story.vue')
const STORY = '/story/app-components-simple-story-vue?variantId=_default'

test.describe.configure({ mode: 'serial' })

test.describe('editing a story in a Nuxt book', () => {
  let original: string

  test.beforeAll(() => {
    original = readFileSync(STORY_FILE, 'utf8')
  })

  test.afterAll(() => {
    writeFileSync(STORY_FILE, original)
  })

  test('reaches the preview without a restart', async ({ page }) => {
    await page.goto(STORY)
    const preview = page.getByTestId('preview-iframe').contentFrame()
    await expect(preview.getByText('Simple story in Nuxt')).toBeVisible()

    // The write is retried as well as the assertion, as in the markdown spec: the
    // watcher has to be up before an edit is delivered at all.
    await expect(async () => {
      writeFileSync(STORY_FILE, original.replace('Simple story in Nuxt', 'Simple story in Nuxt EDITED-BY-SPEC'))
      await expect(preview.getByText('EDITED-BY-SPEC')).toBeVisible({ timeout: 5_000 })
    }).toPass({ timeout: 60_000 })
    await expect(page.getByTestId('story-error')).toHaveCount(0)
  })
})
