import { expect, test } from '@playwright/test'

/*
 * Nuxt turns Vite's public directory off and serves `public/` through Nitro,
 * which a book doesn't have, so a story's `/file.json` wasn't there (#1595).
 *
 * The content type is asserted because `poveste preview` answers an unknown path
 * with the app's HTML, so a status alone passes without the file.
 */
const STORY = 'app-components-stories-lottieanimation-story-vue'

test.describe('a Nuxt book\'s public directory', () => {
  test('serves a file from it', async ({ request }) => {
    const response = await request.get('/lottie-data.json')

    expect(response.headers()['content-type']).toContain('json')
  })

  test('lets a story load a file from it', async ({ page }) => {
    await page.goto(`/story/${STORY}`)
    const animation = page.getByTestId('preview-iframe').contentFrame().locator('svg')

    // A cold dev server re-bundles on the first page and reloads it (#1213).
    await expect(animation).toBeAttached({ timeout: 60_000 })
  })
})
