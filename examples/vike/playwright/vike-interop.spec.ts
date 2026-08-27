import { expect, test } from '@playwright/test'

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
 * catch. Remove the condition from vite.config.ts and both tests below fail: the
 * story renders poveste's render-error panel instead of the component.
 */

const STORY_URL = '/story/src-button-story-vue'
const BUTTON = '.vike-example-button'

test.describe('poveste inside a Vike project', () => {
  test('renders a story instead of the framework runtime error', async ({ page }) => {
    await page.goto(STORY_URL)

    const button = page.getByTestId('preview-iframe').contentFrame().locator(BUTTON)

    await expect(button).toBeVisible()
    await expect(button).toHaveText('Built alongside Vike')
    // The component mounting is not on its own proof: Vike's assertion is thrown
    // asynchronously, and in this story the button still appears while it fails
    // behind it. `story-error` is what shows when a story throws during render
    // (#323), so absence of the panel is the part that means the story is healthy.
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

    await page.goto(STORY_URL)
    await expect(page.getByTestId('preview-iframe').contentFrame().locator(BUTTON)).toBeVisible()

    expect(errors.filter(error => /vike/i.test(error))).toEqual([])
  })
})
