import { expect, test } from '@playwright/test'

/*
 * The chrome imports Vue as `poveste-vue` and the book's stories import `vue`.
 * Vite keys a pre-bundled dependency by the name it is imported under, so unless
 * the first is pointed at the second, a dev server pre-bundles both: one file
 * under two names, two Vue runtimes, and reactivity that does not cross between
 * the chrome and a story (#1060, #1201). This workspace is the pnpm layout where
 * that last happened, and the smoke test's dev pass only sees an installed
 * consumer, so this is what holds a workspace book to one Vue (#1220).
 */
test('the dev server serves one Vue runtime to the app and its preview', async ({ page }) => {
  const preview = page.getByTestId('preview-iframe').contentFrame().getByRole('button', { name: 'Click me' })
  await page.goto('/story/conformance-button')
  await expect(preview).toBeVisible({ timeout: 30_000 })

  // Counted on a second load: the first page of a cold server is reloaded while
  // the optimizer bundles, and can hold modules from more than one of its runs.
  const runtimes = new Set<string>()
  page.on('response', (response) => {
    const { pathname } = new URL(response.url())
    if (/\/deps\/(?:poveste-)?vue\.js$|\/vue\/dist\/vue\.[^/]*\.js$/.test(pathname)) {
      runtimes.add(pathname)
    }
  })
  await page.reload()
  await expect(preview).toBeVisible({ timeout: 30_000 })

  expect([...runtimes]).toEqual(['/node_modules/.pvt-vite/deps/vue.js'])
})
