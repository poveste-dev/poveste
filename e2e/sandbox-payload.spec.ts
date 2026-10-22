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
  // A book whose framework ships a large global stylesheet, as Quasar does, carries a
  // budget of its own, with the reason in `playwright.config.ts`: the shared one is not
  // raised for it, and the book still fails when it gets heavier (#542).
  const own: { bytes: number, reason: string } | undefined = testInfo.project.metadata?.sandboxCssBudget

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
  expect(totalCss, `sandbox booted with ${styles.length} stylesheets totalling ${totalCss} bytes${own ? `, against this book's own budget: ${own.reason}` : ''}`).toBeLessThan(own?.bytes ?? SANDBOX_CSS_BUDGET)
  // A realm that needs the network to boot is a realm that fails offline.
  expect(external, `sandbox reached out to ${external.join(', ')}`).toEqual([])
})

// A builtin control drawn in a story's own content, which `conformance-controls`
// has: a select, with the chrome's chevron on it. Each realm has an icon store
// of its own and only the app's was given the data, so that chevron was fetched
// from api.iconify.design in every sandbox, and was missing offline (#255). The
// test above could not see it: its story renders no control.
test('a builtin control in a story draws its icon without the network', async ({ page }, testInfo) => {
  // The Svelte books' story keeps its controls in the panel and has none in its
  // own content. The realm under test is the app's, the same in every book.
  test.skip(testInfo.project.name.startsWith('svelte'), 'no builtin control in this book\'s story content')

  const external: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (/^https?:/.test(url) && !/^https?:\/\/(?:localhost|127\.0\.0\.1)[:/]/.test(url)) {
      external.push(url)
    }
  })

  await page.goto('/__sandbox.html?storyId=conformance-controls&variantId=_default')

  await expect(page.locator('.__poveste-render-story .poveste-select svg').first()).toBeVisible()
  expect(external, `sandbox reached out to ${external.join(', ')}`).toEqual([])
})
