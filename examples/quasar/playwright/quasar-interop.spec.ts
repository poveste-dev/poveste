import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { recordSandboxReady, waitForAnySandboxReady } from '../../../e2e/support'

/*
 * The guard on `@poveste/plugin-quasar` and the recipe that documents it (#436).
 *
 * Quasar's Vite config is only available asynchronously, through an entrypoint
 * meant for tooling. Fetching it takes two adjustments that are not guessable,
 * and the plugin makes both:
 *
 *   - Quasar's plugins pass through unchanged. Dropping its Vue plugin as a
 *     duplicate fails config resolution outright.
 *   - Quasar stays transformed rather than externalised, or collection loads its
 *     source through Node and `__QUASAR_VERSION__` is never written.
 *
 * Break either and the book stops building, so a broken plugin is a red job
 * rather than a page that quietly stopped being true.
 *
 * The setup file also runs the app's boot file, because nothing else does. That
 * one fails quietly instead — the build succeeds and the value is just missing —
 * so it needs an assertion rather than a build.
 */

/*
 * Absence is only worth asserting once the page has stopped working, and what
 * that means here is the sandbox reporting its story mounted — not the network
 * going quiet.
 *
 * `waitForLoadState('networkidle')` was this wait, and against a dev server it
 * waits for something that need not happen. Measured on `quasar:dev`, one
 * worker, nothing else running: it resolved on 27 of 30 navigations and did not
 * resolve inside 25 seconds on the other three, and the slowest of the 27 took
 * 17.5 seconds. One run in ten, before CI's three shared workers are anywhere
 * near it — which is how two of eighteen PRs lost this job on one push, one of
 * them through all three attempts (#774).
 *
 * The trace of a failed attempt says why it is not the page's fault: every HTTP
 * request finished 26 seconds before the 30 the test spent waiting, and what is
 * left open is Vite's HMR socket, twice, on the same token — a reconnect, which
 * Playwright counts as a live connection and cannot tell from work.
 *
 * `__poveste:sandbox-ready` is posted once the story has mounted and the state
 * that mount publishes has gone out, so it is later than the component being
 * visible and it arrives whatever the dev server's sockets are doing. A story
 * that never gets there fails here, which is the same answer the assertions
 * below would have given.
 */
async function settle(page: Page) {
  await waitForAnySandboxReady(page)
}

const STORY_URL = '/story/src-components-quasarbutton-story-vue'

test.describe('poveste in a Quasar project', () => {
  test('renders a Quasar component, styled by Quasar', async ({ page }) => {
    await recordSandboxReady(page)
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

    await recordSandboxReady(page)
    await page.goto(STORY_URL)
    await expect(page.getByTestId('preview-iframe').contentFrame().locator('.q-btn')).toBeVisible()

    await settle(page)
    expect(errors.filter(error => /quasar/i.test(error))).toEqual([])
  })
})
