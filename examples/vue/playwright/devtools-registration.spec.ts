import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// One of the two promises #791 makes, and the one worth 257 KB: a published book
// carries no Vue Devtools code, because a reader cannot use it.
//
// The marker is a function only the real `@vue/devtools-api` defines — the stub
// `vite.ts` swaps in exports `setupDevtoolsPlugin` and nothing else. Reading the
// served JavaScript rather than watching for a known URL: #347 removed the
// vendored chunk this used to watch for, and a promise about what a book weighs
// is better kept against what it actually serves.
//
// The other promise — that `poveste dev` still loads the real module, for
// Poveste's own stores — no longer has a test, and this is deliberate rather
// than an omission.
//
// It used to be checked by watching for a vendored chunk only Poveste's copy
// produced. #347 made the vendored entries re-export the real packages, so a book
// whose own Vue satisfies ours resolves to one copy and there is no second module
// to tell apart; the kit's context exposes no app records without a devtools
// client attached, so it cannot answer either. And the part that could still be
// asserted — that dev serves the real module — cannot fail: Vite's dep optimiser
// bakes it into a chunk before the stub can intervene, so flipping the stub to
// `apply: 'serve'` leaves dev serving it anyway. Measured.
//
// So this spec runs against a built book only. An assertion that cannot fail is
// worse than an absent one, because it reads as cover.
const REAL_MODULE = 'callDevToolsPluginSetupFn'

/** Every served script carrying the real module, by path. */
async function devtoolsCarryingScripts(page: Page) {
  const carrying: string[] = []

  page.on('response', async (response) => {
    if (!/\.m?[jt]s(?:\?|$)/.test(response.url())) {
      return
    }
    const body = await response.text().catch(() => '')
    if (body.includes(REAL_MODULE)) {
      carrying.push(new URL(response.url()).pathname)
    }
  })

  await page.goto('/')
  await expect(page.locator('[data-testid="story-list-item"]').first()).toBeVisible({ timeout: 60_000 })
  return carrying
}

test.describe('Vue Devtools registration', () => {
  test('is absent from a built book', async ({ page }) => {
    const carrying = await devtoolsCarryingScripts(page)

    expect(carrying).toEqual([])
    expect(await page.evaluate(() => (window as any).__VUE_DEVTOOLS_KIT_CONTEXT__ !== undefined)).toBe(false)
  })
})
