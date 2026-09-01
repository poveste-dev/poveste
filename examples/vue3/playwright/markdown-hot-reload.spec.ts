import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

// Editing a markdown file did nothing until the server was restarted: the
// watcher wired `add` and `unlink` and not `change`, so the edit was watched,
// delivered and dropped (#370).
//
// A dev-server spec rather than a unit test, because the defect was in the wiring
// between chokidar, the markdown renderer and the client — every part of which
// worked on its own. Nothing exercised `poveste dev` (#351).
const MARKDOWN = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'MarkdownFile.story.md')
const STORY = '/story/src-markdownfile-story-js'

// Serial: these edit one file on disk and restore it, so they must not interleave.
test.describe.configure({ mode: 'serial' })

test.describe('editing a markdown file', () => {
  let original: string

  test.beforeAll(() => {
    original = readFileSync(MARKDOWN, 'utf8')
  })

  test.afterAll(() => {
    writeFileSync(MARKDOWN, original)
  })

  test('re-renders the page without a restart', async ({ page }) => {
    await page.goto(STORY)
    await expect(page.getByText('rendering as a docs-only story')).toBeVisible()

    /*
     * The write is retried, not just the assertion. chokidar's initial scan has
     * to finish before an edit is delivered at all, and the first spec in this
     * project can win that race — which showed as a 15s failure followed by a
     * 2.5s pass on retry. A spec that only passes on retry reads as flaky
     * forever, so the arrange step is what repeats.
     *
     * Not a weaker check: the rendered text is still asserted, unchanged. This
     * only insists the edit be delivered before that is judged.
     */
    await expect(async () => {
      writeFileSync(MARKDOWN, original.replace('docs-only story.', 'docs-only story. EDITED-BY-SPEC.'))
      await expect(page.getByText('EDITED-BY-SPEC')).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })
  })
})
