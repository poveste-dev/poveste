import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/*
 * The guard on the Quasar recipe in docs/guide/config.md (#436).
 *
 * Quasar's Vite config is only available asynchronously, through
 * `@quasar/app-vite/testing`. Pulling it in takes two things that are not
 * guessable and that this book's `poveste.config.ts` — copied from the docs —
 * is here to keep true:
 *
 *   - Quasar's plugins are passed through unchanged. Dropping its Vue plugin
 *     fails config resolution outright.
 *   - `ssr.noExternal: [/quasar/]`, or collection loads Quasar's source through
 *     Node and `__QUASAR_VERSION__` is never written.
 *
 * Remove either and the book stops building, so a broken recipe is a red job
 * rather than a page that quietly stopped being true.
 *
 * The setup file also runs the app's boot file, because nothing else does. That
 * one fails quietly instead — the build succeeds and the value is just missing —
 * so it needs an assertion rather than a build.
 */

// Absence is only worth asserting once the page has stopped working.
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
}

const STORY_URL = '/story/src-components-quasarbutton-story-vue'

test.describe('poveste in a Quasar project', () => {
  test('renders a Quasar component, styled by Quasar', async ({ page }) => {
    await page.goto(STORY_URL)

    const button = page.getByTestId('preview-iframe').contentFrame().locator('.q-btn')

    await expect(button).toBeVisible()
    // Quasar's own class, its own uppercasing, and its own primary colour: the
    // component is mounted *and* Quasar's CSS reached it. Markup alone would
    // pass with the framework half-installed.
    await expect(button).toHaveText('Built with Quasar')
    await expect(button).toHaveCSS('text-transform', 'uppercase')
    await expect(button).toHaveCSS('background-color', 'rgb(25, 118, 210)')

    await settle(page)
    await expect(page.locator('[data-testid="story-error"]')).toHaveCount(0)
  })

  test('runs a boot file, which nothing else in a story would', async ({ page }) => {
    await page.goto('/story/src-components-bootgreeting-story-vue')

    const banner = page.getByTestId('preview-iframe').contentFrame().locator('.q-banner')

    await expect(banner).toBeVisible()
    // Drop the `greeting({ app })` line from the setup file and this reads
    // "NO BOOT FILE RAN" — with a green build and no error panel, which is why
    // the docs give it a heading.
    await expect(banner).toHaveText('from a boot file')
  })

  test('leaves no framework runtime complaining in the console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text())
      }
    })
    page.on('pageerror', error => errors.push(error.message))

    await page.goto(STORY_URL)
    await expect(page.getByTestId('preview-iframe').contentFrame().locator('.q-btn')).toBeVisible()

    await settle(page)
    expect(errors.filter(error => /quasar/i.test(error))).toEqual([])
  })
})
