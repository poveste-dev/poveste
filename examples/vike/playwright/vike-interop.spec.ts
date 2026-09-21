import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { recordSandboxReady, waitForAnySandboxReady } from '../../../e2e/support'

/*
 * Poveste building a book inside a Vike project (#369, inherited from
 * histoire-dev/histoire#802).
 *
 * Two build-time blockers were fixed in the bundler config: the app entries are
 * named rather than absolute paths, and the client environment's `outDir` is
 * honoured. Past those, Vike's client runtime still executes inside the book and
 * asserts on markup it expects to have injected — `#vike_globalContext` — which a
 * poveste page does not have. The cure is not code: `vite.config.ts` leaves
 * `vike()` out when `process.env.POVESTE` is set.
 *
 * That makes this a fixture for a *configuration* contract, which nothing else can
 * catch. To confirm it still bites, drop the condition and rebuild the book: the
 * story renders poveste's render-error panel and both tests below fail. A whole
 * `POVESTE_E2E_EXAMPLE=vike` run does not get that far — without the condition
 * Vike's middleware also takes over `/` on the dev server and answers 500, so
 * Playwright times out waiting for a web server before any test runs.
 *
 * The other half of the condition — that the Vike app itself is left alone — is
 * guarded by the `vike:build` step in .github/workflows/test-examples.yml, not
 * from here.
 */

const STORY_URL = '/story/src-button-story-vue'
const BUTTON = '.vike-example-button'

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
 *
 * Both tests here assert an absence and Vike fails after the component mounts,
 * so the button appearing would confirm "no error yet" rather than "no error".
 * The ready message is past that: dropping the `POVESTE` condition from
 * `vite.config.ts` still reds both of them.
 */
async function settle(page: Page) {
  await waitForAnySandboxReady(page)
}

test.describe('poveste inside a Vike project', () => {
  test('renders a story instead of the framework runtime error', async ({ page }) => {
    await recordSandboxReady(page)
    await page.goto(STORY_URL)

    const button = page.getByTestId('preview-iframe').contentFrame().locator(BUTTON)

    await expect(button).toBeVisible()
    await expect(button).toHaveText('Built alongside Vike')

    // The component mounting is not on its own proof: in this story the button
    // still appears while Vike fails behind it. `story-error` is what shows when a
    // story throws during render (#323), so absence of the panel is the part that
    // means the story is healthy.
    await settle(page)
    await expect(page.locator('[data-testid="story-error"]')).toHaveCount(0)
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
    await expect(page.getByTestId('preview-iframe').contentFrame().locator(BUTTON)).toBeVisible()

    await settle(page)
    expect(errors.filter(error => /vike/i.test(error))).toEqual([])
  })
})
