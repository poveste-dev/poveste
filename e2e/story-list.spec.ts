import { expect, test } from '@playwright/test'
import { SHARED_STORIES, SHARED_STORY_TITLES } from './stories.js'

// The four framework examples are supposed to present the same book. They did
// not: vue3 had the stories and the others had a handful, so a chrome feature
// could be exercised on Vue and silently untested everywhere else — which is how
// the state sync, the controls panel and the variant grid all ended up with bugs
// only vue3 could have caught.
//
// Read from `poveste.json`, which the build writes next to the book: it is the
// collector's own output, so it says what this book actually contains rather
// than what the sidebar happens to have rendered.
async function bookStories(request: { get: (url: string) => Promise<any> }) {
  const response = await request.get('/poveste.json')
  expect(response.ok(), 'the book did not serve poveste.json').toBe(true)

  const body = await response.json() as { stories: { id: string, title: string }[] }
  return body.stories
}

test.describe('shared story list', () => {
  /*
   * Two different claims, and they were one flag.
   *
   * Every conformance book carries the 17 ids in `SHARED_STORIES` — that is the
   * contract the shared specs drive. Only a *reference* book also carries the
   * full 54-title set, which is this book's demo content: `BaseButton`,
   * `Code gen`, `Color Button`. Requiring both of every conformance book would
   * price onboarding a framework at 54 stories rather than 17, on a repo with
   * React and Solid requested (#499).
   */
  test('carries every shared story', async ({ request }, testInfo) => {
    test.skip(!testInfo.project.metadata?.reference, 'a conformance book that is not a mirror of the reference book')

    const stories = await bookStories(request)
    const titles = new Set(stories.map(story => story.title))

    // Reported together rather than one `expect` per story: a framework that is
    // behind is usually behind on several, and finding that out one CI run at a
    // time is the slow way.
    const missing = SHARED_STORY_TITLES.filter(title => !titles.has(title))

    expect(missing).toEqual([])
  })

  test('addresses the shared ids by the titles specs expect', async ({ request }) => {
    const stories = await bookStories(request)
    const byId = new Map(stories.map(story => [story.id, story.title]))

    const wrong = SHARED_STORIES
      .filter(story => byId.get(story.id) !== story.title)
      .map(story => `${story.id}: expected "${story.title}", found ${JSON.stringify(byId.get(story.id) ?? null)}`)

    expect(wrong).toEqual([])
  })
})
