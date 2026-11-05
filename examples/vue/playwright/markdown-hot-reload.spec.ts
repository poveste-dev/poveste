import { readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs'
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
const NOTES = join(dirname(MARKDOWN), 'conformance', 'LoadedMarkdown.notes.md')

// Serial: these edit one file on disk and restore it, so they must not interleave.
test.describe.configure({ mode: 'serial' })

test.describe('editing a markdown file', () => {
  let original: string
  let originalNotes: string
  let times: { atime: Date, mtime: Date }
  let notesTimes: { atime: Date, mtime: Date }

  test.beforeAll(() => {
    original = readFileSync(MARKDOWN, 'utf8')
    originalNotes = readFileSync(NOTES, 'utf8')
    times = statSync(MARKDOWN)
    notesTimes = statSync(NOTES)
  })

  // The times as well as the text: the bundle-size check refuses a book older
  // than its source, and CI runs it after this spec, on a book built before (#1047).
  test.afterAll(() => {
    writeFileSync(MARKDOWN, original)
    utimesSync(MARKDOWN, times.atime, times.mtime)
    writeFileSync(NOTES, originalNotes)
    utimesSync(NOTES, notesTimes.atime, notesTimes.mtime)
  })

  // Neither of these edits a story file, so nothing but the loaded file's own
  // watcher can say it changed (#161).
  test('re-renders a `<docs src>` block when the file it loads changes', async ({ page }) => {
    await page.goto('/story/conformance-loaded-markdown')
    await page.getByTestId('story-side-panel').getByRole('link', { name: 'Docs' }).click()
    await expect(page.getByTestId('story-docs')).toContainText('Loaded from another file')

    await expect(async () => {
      writeFileSync(NOTES, originalNotes.replace('Loaded from', 'EDITED-BLOCK loaded from'))
      await expect(page.getByTestId('story-docs')).toContainText('EDITED-BLOCK', { timeout: 2_000 })
    }).toPass({ timeout: 20_000 })
    writeFileSync(NOTES, originalNotes)
  })

  test('re-renders a `.story.md` with `src` when the file it loads changes', async ({ page }) => {
    await page.goto(STORY)

    await expect(async () => {
      writeFileSync(MARKDOWN, `---\nsrc: ./conformance/LoadedMarkdown.notes.md\n---\n`)
      await expect(page.getByText('Loaded from another file')).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })

    await expect(async () => {
      writeFileSync(NOTES, originalNotes.replace('Loaded from', 'EDITED-PAGE loaded from'))
      await expect(page.getByText('EDITED-PAGE')).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })
    writeFileSync(NOTES, originalNotes)
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

  // The other half, split out of #370 as #539. A standalone file's story is a
  // virtual module built from frontmatter when the story is created, so the
  // rendered content reloading says nothing about the title: that lives in the
  // story module's code and is not re-read from disk.
  test('renames the story when frontmatter changes, without a restart', async ({ page }) => {
    await page.goto(STORY)
    const listItem = page.locator('[data-testid="story-list-item"]', { hasText: 'MarkdownFile' })
    await expect(listItem).toBeVisible()

    // Same retried-arrange as above, for the same reason: the edit has to be
    // delivered before the assertion means anything.
    await expect(async () => {
      writeFileSync(MARKDOWN, `---\ntitle: RENAMED-BY-SPEC\n---\n\n${original}`)
      await expect(page.locator('[data-testid="story-list-item"]', { hasText: 'RENAMED-BY-SPEC' }))
        .toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })
  })
})
