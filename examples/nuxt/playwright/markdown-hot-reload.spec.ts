import type { Frame, Page } from '@playwright/test'
import { readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { openStory } from '../../../e2e/support'

// Every `.story.md` save in this book reloaded the page about 200 ms after the new text was
// already in place, losing scroll, the open panel and Controls (#1645). Not Nuxt's doing: the
// book's Tailwind plugin watches the file for classes, and reloads the page when a file that is
// not a module changes. A Vue book without Tailwind never showed it.
const COMPONENTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'components')
const STANDALONE = join(COMPONENTS, 'MarkdownFile.story.md')
const SIBLING = join(COMPONENTS, 'stories', 'BaseButton.story.md')

// A reload is a new window, so a stamp left on the old one is gone. Every frame is stamped: the
// sibling's save reloaded the preview frames as well as the page.
async function stamp(page: Page): Promise<Frame[]> {
  const frames = page.frames()
  await Promise.all(frames.map(frame => frame.evaluate(() => {
    (window as any).__notReloaded = true
  })))
  return frames
}

// The reload came about 200 ms after the text, so the text alone passed; this waits past it.
async function expectNoReload(page: Page, frames: Frame[]) {
  await page.waitForTimeout(1_500)
  for (const frame of frames) {
    expect(frame.isDetached(), `${frame === page.mainFrame() ? 'the page' : 'a preview frame'} was rebuilt`).toBe(false)
    expect(await frame.evaluate(() => (window as any).__notReloaded), `${frame === page.mainFrame() ? 'the page' : 'a preview frame'} reloaded`).toBe(true)
  }
}

test.describe.configure({ mode: 'serial' })

test.describe('saving a .story.md in a Nuxt book', () => {
  const saved = new Map<string, { text: string, atime: Date, mtime: Date }>()

  test.beforeAll(() => {
    for (const file of [STANDALONE, SIBLING]) {
      const { atime, mtime } = statSync(file)
      saved.set(file, { text: readFileSync(file, 'utf8'), atime, mtime })
    }
  })

  // The times as well as the text, as in the Vue book's markdown spec (#1047).
  test.afterAll(() => {
    for (const [file, { text, atime, mtime }] of saved) {
      writeFileSync(file, text)
      utimesSync(file, atime, mtime)
    }
  })

  test('updates a standalone page in place', async ({ page }) => {
    const original = saved.get(STANDALONE)!.text
    await openStory(page, 'app-components-markdownfile-story-js')
    await expect(page.getByText('rendering as a docs-only story')).toBeVisible()
    const frames = await stamp(page)

    // The write is retried as well as the assertion: the watcher has to be up before an edit
    // is delivered at all.
    await expect(async () => {
      writeFileSync(STANDALONE, original.replace('docs-only story.', 'docs-only story. EDITED-BY-SPEC.'))
      await expect(page.getByText('EDITED-BY-SPEC')).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })
    await expectNoReload(page, frames)
  })

  test('updates a story\'s docs in place, and leaves its previews alone', async ({ page }) => {
    const original = saved.get(SIBLING)!.text
    await openStory(page, 'app-components-stories-basebutton-story-vue')
    await page.getByTestId('story-side-panel').getByRole('link', { name: 'Docs' }).click()
    await expect(page.getByTestId('story-docs')).toContainText('Hello world!')
    await expect(page.getByTestId('preview-iframe').first().contentFrame().locator('body')).not.toBeEmpty({ timeout: 20_000 })
    const frames = await stamp(page)

    await expect(async () => {
      writeFileSync(SIBLING, original.replace('Hello world!', 'Hello world! EDITED-BY-SPEC.'))
      await expect(page.getByTestId('story-docs')).toContainText('EDITED-BY-SPEC', { timeout: 2_000 })
    }).toPass({ timeout: 20_000 })
    await expectNoReload(page, frames)
  })
})
