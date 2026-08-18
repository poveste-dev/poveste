import { expect, test } from '@playwright/test'

// What this example is for: poveste running inside a real SvelteKit app, with
// `sveltekit()` in the Vite plugin chain, `svelte-preprocess` on components and
// Kit's own route files sitting next to the stories. Plain Svelte 5 is already
// covered by examples/svelte5 — everything here is about the Kit integration.

const COUNTER = '/story/src-lib-counter-story-svelte?variantId=_default'

test.describe('story collection in a SvelteKit app', () => {
  test('collects the story and leaves Kit route files alone', async ({ page }) => {
    await page.goto('/')

    const stories = page.getByTestId('story-list-item')

    // Two, and only two: the example's own Counter plus poveste's built-in
    // Tailwind tokens story. Ordering follows the tree groups, so match by
    // content rather than by index.
    await expect(stories).toHaveCount(2)
    await expect(stories.filter({ hasText: 'Counter' })).toHaveCount(1)

    // src/routes holds +page.svelte, +layout.svelte and the about/ and todos/
    // pages. They are .svelte files sitting in the collection root, so a
    // regression that stopped honouring the `.story.svelte` convention would
    // show up here as extra entries — the count above is the real guard, these
    // two just name what must not appear.
    await expect(stories.filter({ hasText: '+page' })).toHaveCount(0)
    await expect(stories.filter({ hasText: '+layout' })).toHaveCount(0)
  })
})

test.describe('story render', () => {
  test('renders a component that goes through svelte-preprocess', async ({ page }) => {
    await page.goto(COUNTER)
    const iframe = page.getByTestId('preview-iframe').contentFrame()

    // Counter.svelte is `<script lang="ts">` and imports `spring` from
    // svelte/motion, so this covers the preprocessor and the Svelte runtime,
    // not just static markup.
    await expect(iframe.getByLabel('Increase the counter by one')).toBeVisible()
    await expect(iframe.getByLabel('Decrease the counter by one')).toBeVisible()
    await expect(iframe.locator('.counter-viewport')).toContainText('0')
  })

  test('runs the component, not just its initial markup', async ({ page }) => {
    await page.goto(COUNTER)
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    const digits = iframe.locator('.counter-digits strong:not(.hidden)')

    await expect(digits).toHaveText('0')
    await iframe.getByLabel('Increase the counter by one').click()
    // The count runs through a `spring`, so the displayed value eases in.
    await expect(digits).toHaveText('1')
  })
})

test.describe('setup file', () => {
  test('applies poveste.setup.ts styles inside the story sandbox', async ({ page }) => {
    await page.goto(COUNTER)
    const iframe = page.getByTestId('preview-iframe').contentFrame()

    // `--accent-color: #ff3e00` is declared in src/poveste.css, which only
    // reaches the page via the `setupFile` entry in vite.config.ts. The counter
    // digit is `color: var(--accent-color)`, so the computed colour proves both
    // that the setup file ran and that its custom properties cascade into the
    // sandboxed story.
    await expect(iframe.locator('.counter-digits strong').first())
      .toHaveCSS('color', 'rgb(255, 62, 0)')
  })
})
