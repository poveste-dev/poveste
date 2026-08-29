import { expect, test } from '@playwright/test'

/*
 * A plain Svelte book keeps its assets in Vite's own `public/`, and must go on
 * doing so while the plugin teaches SvelteKit books about `static/` (#463).
 *
 * This is not hypothetical. Detecting Kit with `require.resolve` passed every
 * test above: resolution walks up out of the project and finds Kit through a
 * sibling in the workspace store, so this book was declared SvelteKit, had its
 * `publicDir` pointed at a `static/` it does not have, and silently stopped
 * serving `public/`.
 */
test('serves the assets in public/', async ({ request }) => {
  const response = await request.get('/lottie-data.json')

  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('application/json')
})
