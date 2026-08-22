import { expect, test } from '@playwright/test'

/*
 * A grid renders one sandbox iframe per cell and each iframe is its own realm,
 * so whatever the sandbox entry's static graph weighs is paid once per cell —
 * the HTTP cache saves the download, never the evaluation (#103, #197).
 *
 * The split that keeps the highlighter out of that graph has been silently
 * undone once already: the bundler parked its `__vitePreload` helper inside the
 * highlighter chunk, and three sandbox-side chunks imported the helper — a
 * static import of 10 MB of grammars to get a 20-line function. The bundle
 * graph looked correct throughout; only the network told the truth. Hence a
 * network-level budget rather than an import-graph assertion.
 */
const SANDBOX_JS_BUDGET = 4 * 1024 * 1024

test('the sandbox boots inside its script budget, without the highlighter', async ({ page }) => {
  const scripts: { name: string, bytes: number }[] = []
  page.on('response', async (response) => {
    if (!response.url().endsWith('.js')) return
    const body = await response.body().catch(() => null)
    scripts.push({ name: response.url().split('/').pop(), bytes: body?.length ?? 0 })
  })

  await page.goto('/__sandbox.html?storyId=conformance-button&variantId=default')
  await expect(page.locator('.__poveste-render-story button').first()).toBeVisible()

  const total = scripts.reduce((sum, s) => sum + s.bytes, 0)
  const highlighter = scripts.filter(s => s.name.startsWith('highlighter'))

  expect(highlighter, `sandbox loaded ${highlighter.map(s => s.name).join(', ')}`).toHaveLength(0)
  expect(total, `sandbox booted with ${scripts.length} scripts totalling ${total} bytes`).toBeLessThan(SANDBOX_JS_BUDGET)
})
