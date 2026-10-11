import { expect, test } from '@playwright/test'

/*
 * `useNuxtApp` was stubbed by the Nuxt plugin until #439, and the stub answered
 * `runWithContext` and nothing else. A story could call the composable and get
 * an object back, so nothing looked broken — but `$config` read as undefined
 * and a value injected by a Nuxt plugin was unreachable, which is the case
 * histoire#666 was filed about.
 *
 * Both halves are asserted because the stub returned a truthy object: every
 * failure here is a silent wrong value, never a crash, and an assertion that
 * only waits for something to be absent passes before the iframe has rendered
 * at all.
 *
 * Nuxt-specific, so it lives here rather than in the shared conformance set.
 */
const STORY = 'app-components-pluginprovide-story-vue'

test.describe('useNuxtApp inside a story', () => {
  /*
   * A cold dev server re-bundles its dependencies on the first page and reloads
   * it. Under load that outlasts the 5s an assertion waits, and both tests
   * failed with the preview still on "Loading..." (#1213). The first page gets
   * a page load's time here, and is asked only whether the story's markup
   * arrived: what it says is still for the tests, at their usual 5s.
   */
  test.beforeAll(async ({ browser }, testInfo) => {
    const page = await browser.newPage({ baseURL: testInfo.project.use.baseURL })
    await page.goto(`/story/${STORY}?variantId=${STORY}-0`)
    await expect(
      page.getByTestId('preview-iframe').contentFrame().getByTestId('plugin-provided'),
      'the dev server did not finish its first page',
    ).toBeAttached({ timeout: 60_000 })
    await page.close()
  })

  test('reads a value a Nuxt plugin provided', async ({ page }) => {
    await page.goto(`/story/${STORY}?variantId=${STORY}-0`)
    const provided = page.getByTestId('preview-iframe').contentFrame().getByTestId('plugin-provided')

    await expect(provided).toHaveText('provided by a Nuxt plugin')
  })

  test('carries the runtime config', async ({ page }) => {
    await page.goto(`/story/${STORY}?variantId=${STORY}-0`)
    const config = page.getByTestId('preview-iframe').contentFrame().getByTestId('runtime-config')

    await expect(config).toHaveText('runtime config present')
  })
})
