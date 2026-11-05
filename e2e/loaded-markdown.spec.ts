import { expect, test } from '@playwright/test'
import { openDocs } from './support'

// A story's docs pointed at a markdown file it doesn't own: `<docs src>` in the Vue
// books and `src:` in a sibling `.story.md` in the Svelte ones (#161).
const STORY = 'conformance-loaded-markdown'

test.describe('docs loaded from another file', () => {
  test('show the file, without its frontmatter', async ({ page }) => {
    await openDocs(page, STORY)

    const docs = page.getByTestId('story-docs')
    await expect(docs.locator('h1')).toContainText('Loaded from another file')
    await expect(docs).not.toContainText('This frontmatter')
  })

  test('leave a link to a non-story as written, and route one to a story', async ({ page }) => {
    await openDocs(page, STORY)

    const docs = page.getByTestId('story-docs')
    await expect(docs.getByRole('link', { name: 'license' })).toHaveAttribute('href', './LICENSE')

    await docs.getByRole('link', { name: 'Docs' }).click()

    await expect(page).toHaveURL(/\/story\/[^/]*conformance-docs/)
  })
})
