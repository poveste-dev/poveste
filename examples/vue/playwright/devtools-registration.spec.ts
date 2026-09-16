import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// Two promises #791 makes, and only one of them is visible in a byte count.
//
// A published book carries no Vue Devtools code: a reader cannot use it, and it
// weighed 257 KB. `poveste dev` still loads the real module for Poveste's own
// stores, which is who the registration is for. The first fix kept the first
// promise and silently broke the second — it stubbed the vendors pre-bundle,
// which dev and build share — so this runs in both projects and asserts the one
// that applies.
//
// The kit's global is not enough on its own in dev: the example's own pinia
// loads the real module there too. The vendored chunk being served is what
// shows Poveste's stores register.
const VENDORED = /poveste-vendors\/dist\/client\/devtools-api\.js|@poveste\/vendors\/dist\/client\/devtools-api\.js/

async function openBook(page: Page) {
  const vendored: { status: number, real: boolean }[] = []
  page.on('response', async (response) => {
    if (VENDORED.test(response.url())) {
      const body = await response.text().catch(() => '')
      vendored.push({ status: response.status(), real: body.includes('callDevToolsPluginSetupFn') })
    }
  })
  await page.goto('/')
  await expect(page.locator('[data-testid="story-list-item"]').first()).toBeVisible({ timeout: 60_000 })
  return vendored
}

test.describe('Vue Devtools registration', () => {
  test('is absent from a built book, and present in dev for Poveste itself', async ({ page }) => {
    const vendored = await openBook(page)
    const devtoolsKitLoaded = () => page.evaluate(() => (window as any).__VUE_DEVTOOLS_KIT_CONTEXT__ !== undefined)

    if (test.info().project.name.endsWith(':dev')) {
      await expect.poll(() => vendored.some(module => module.status === 200 && module.real)).toBe(true)
    }
    else {
      expect(await devtoolsKitLoaded()).toBe(false)
      expect(vendored).toEqual([])
    }
  })
})
