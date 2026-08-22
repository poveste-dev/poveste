import { expect, test } from '@playwright/test'

// What this example is for: poveste running inside a real SvelteKit app, with
// `sveltekit()` in the Vite plugin chain, `svelte-preprocess` on components and
// Kit's own route files sitting next to the stories. Plain Svelte 5 is already
// covered by examples/svelte5 — everything here is about the Kit integration.

test.describe('story collection in a SvelteKit app', () => {
  test('collects the stories and leaves Kit route files alone', async ({ page, request }) => {
    await page.goto('/')

    // `poveste.json` is the collector's own output, so it says what was
    // collected rather than what the sidebar happened to render — and it does
    // not care which folder a story ended up in.
    //
    // This used to assert a story count of two. That was a proxy for the real
    // invariant and it stopped meaning anything the moment this example was
    // given the shared story set; asserting the invariant directly is what the
    // count was standing in for anyway.
    const response = await request.get('/poveste.json')
    expect(response.ok()).toBe(true)

    const { stories } = await response.json() as { stories: { id: string, title: string }[] }

    // src/routes holds +page.svelte, +layout.svelte and the about/ and todos/
    // pages. They are .svelte files sitting in the collection root, so a
    // regression that stopped honouring the `.story.svelte` convention would
    // pull them in.
    const routeFiles = stories.filter(story => /\+page|\+layout/.test(story.id) || /\+page|\+layout/.test(story.title))
    expect(routeFiles).toEqual([])

    // The example's own story still collects, through `svelte-preprocess`.
    expect(stories.filter(story => story.title === 'Counter')).toHaveLength(1)
  })
})
