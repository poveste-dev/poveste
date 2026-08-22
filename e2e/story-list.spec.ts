import { expect, test } from '@playwright/test'
import { SHARED_STORIES } from './stories.js'

// The four framework examples are supposed to present the same book. They did
// not: vue3 had the stories and the others had a handful, so a chrome feature
// could be exercised on Vue and silently untested everywhere else — which is
// how the state sync, the controls panel and the variant grid all ended up with
// bugs that only vue3 could have caught.
//
// This holds every book to the same list. A story added to one framework and
// forgotten in another fails here, in that framework's own job, rather than
// being noticed the next time somebody opens the book.
test.describe('shared story list', () => {
  test('carries every shared story, with the same title', async ({ page }) => {
    await page.goto('/')

    const missing: string[] = []
    const misnamed: string[] = []

    for (const story of SHARED_STORIES) {
      await page.goto(`/story/${story.id}`)

      const title = page.locator('.poveste-toolbar-title')

      try {
        // An unresolved id renders the sidebar and an empty shell rather than a
        // 404, so waiting for the title is the only way to tell "missing" from
        // "broken". It has to *wait*: an inline grid takes a moment to render,
        // and a bare `isVisible()` calls that a missing story.
        await title.waitFor({ state: 'visible', timeout: 10_000 })
      }
      catch {
        missing.push(story.id)
        continue
      }

      // The toolbar leads with the *variant* and puts the story underneath, so
      // a story whose variant is named `default` reads "default" then "Button".
      // The story's own title is the last line either way.
      const lines = (await title.locator('span').allTextContents()).map(line => line.trim()).filter(Boolean)
      const shown = lines.at(-1)

      if (shown !== story.title) {
        misnamed.push(`${story.id}: expected "${story.title}", found "${shown}"`)
      }
    }

    // Reported together rather than one `expect` per story: a framework that is
    // behind is usually behind on several, and finding that out one CI run at a
    // time is the slow way.
    expect({ missing, misnamed }).toEqual({ missing: [], misnamed: [] })
  })
})
