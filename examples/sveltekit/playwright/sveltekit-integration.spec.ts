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

/*
 * Kit keeps its static assets in `static/`, and it is `vite-plugin-sveltekit-compile`
 * that tells Vite so — the one plugin poveste drops through `viteIgnorePlugins`.
 * Nothing put the value back, so this book served none of its own assets and
 * answered every one of them with the SPA index page at status 200 (#463).
 *
 * A 200 is why nothing noticed: the suite was green while the Lottie story
 * fetched HTML, and lottie-web's own error for that reads like a bug in lottie.
 * So the content type is the assertion, not the status.
 */
test.describe('static assets in a SvelteKit book', () => {
  test('serves what is in static/, not the index page', async ({ request }) => {
    const response = await request.get('/lottie-data.json')

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')
    await expect(response.json()).resolves.toHaveProperty('v')
  })

  test('renders the story that reads one without an uncaught error', async ({ page }) => {
    const uncaught: string[] = []
    page.on('pageerror', error => uncaught.push(error.message))

    await page.goto('/story/src-lib-stories-lottieanimation-story-svelte')
    await expect(page.getByTestId('preview-iframe')).toBeVisible()
    await expect(page.getByTestId('preview-iframe').contentFrame().locator('.lottie svg')).toBeVisible()

    expect(uncaught).toEqual([])
  })
})
