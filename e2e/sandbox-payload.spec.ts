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

// Same logic for the stylesheet: a sandbox once carried the whole app chrome
// stylesheet (~100 KB it can never match) because a plugin's story imported it,
// plus a render-blocking Google Fonts @import every realm re-fetched (#219).
const SANDBOX_CSS_BUDGET = 48 * 1024

test('the sandbox boots inside its script budget, without the highlighter', async ({ page }, testInfo) => {
  /*
   * Quasar ships ~262 KB of its own CSS into every sandbox, five times this
   * budget. Skipped rather than raised: the budget is what makes the number
   * visible, and raising it to accommodate one framework would hide the same
   * regression everywhere else. Filed as #542 as a finding about shipping a
   * Quasar book, and deliberately not a blocker on promoting it (#499).
   */
  test.skip(testInfo.project.metadata?.overSandboxCssBudget, 'known to exceed the CSS budget — #542')

  const scripts: { name: string, bytes: number }[] = []
  const styles: { name: string, bytes: number }[] = []
  const external: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (/^https?:/.test(url) && !/^https?:\/\/(?:localhost|127\.0\.0\.1)[:/]/.test(url)) {
      external.push(url)
    }
  })
  page.on('response', async (response) => {
    const url = response.url()
    if (!url.endsWith('.js') && !url.endsWith('.css')) return
    const body = await response.body().catch(() => null)
    const entry = { name: url.split('/').pop(), bytes: body?.length ?? 0 }
    ;(url.endsWith('.js') ? scripts : styles).push(entry)
  })

  await page.goto('/__sandbox.html?storyId=conformance-button&variantId=default')
  await expect(page.locator('.__poveste-render-story button').first()).toBeVisible()

  const totalJs = scripts.reduce((sum, s) => sum + s.bytes, 0)
  const totalCss = styles.reduce((sum, s) => sum + s.bytes, 0)
  const highlighter = scripts.filter(s => s.name.startsWith('highlighter'))

  expect(highlighter, `sandbox loaded ${highlighter.map(s => s.name).join(', ')}`).toHaveLength(0)
  expect(totalJs, `sandbox booted with ${scripts.length} scripts totalling ${totalJs} bytes`).toBeLessThan(SANDBOX_JS_BUDGET)
  expect(totalCss, `sandbox booted with ${styles.length} stylesheets totalling ${totalCss} bytes`).toBeLessThan(SANDBOX_CSS_BUDGET)
  // A realm that needs the network to boot is a realm that fails offline.
  expect(external, `sandbox reached out to ${external.join(', ')}`).toEqual([])
})
