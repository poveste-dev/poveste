import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

declare global {
  interface Window {
    __tooltipTiming: { hovered?: number, shown?: number }
  }
}

// The chrome's tooltips, which #918 moves off floating-vue one call site at a
// time. What has to survive that is not "a tooltip appears" but the behaviour a
// reader already has: it waits before opening, and it mounts inside the app root
// rather than on `body`, where the chrome's `@scope` boundary would not reach it.
//
// Chrome rather than framework, so it drives a conformance id and runs in every
// book.
const STORY = 'conformance-button'

test.describe('chrome tooltip', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, STORY)
  })

  test('opens on hover, inside the app root', async ({ page }) => {
    await page.locator('.poveste-toolbar-new-tab').hover()

    const tooltip = page.locator('.poveste-tooltip')
    await expect(tooltip).toContainText('Open variant in new tab')
    await expect(page.locator('.poveste-app-root .poveste-tooltip')).toHaveCount(1)
  })

  test('waits before opening, as the chrome always has', async ({ page }) => {
    // Timed in the page rather than around `hover()`: that call does its own
    // actionability work first, and measured from outside it reports over 150ms
    // even with the delay set to zero — a test that cannot fail.
    await page.evaluate(() => {
      window.__tooltipTiming = {}
      document.addEventListener('pointerover', (event) => {
        if ((event.target as Element).closest?.('.poveste-toolbar-new-tab')) {
          window.__tooltipTiming.hovered ??= performance.now()
        }
      }, true)
      new MutationObserver(() => {
        if (document.querySelector('.poveste-tooltip')) {
          window.__tooltipTiming.shown ??= performance.now()
        }
      }).observe(document.body, { childList: true, subtree: true })
    })

    await page.locator('.poveste-toolbar-new-tab').hover()
    await page.waitForSelector('.poveste-tooltip')

    // floating-vue's tooltip theme opened after 200ms; Reka's own default is 700.
    // Either extreme is a visible change of behaviour in 24 places at once, so
    // this is a floor rather than a window — a slow runner only inflates it.
    const timing = await page.evaluate(() => window.__tooltipTiming)
    expect(timing.shown! - timing.hovered!).toBeGreaterThanOrEqual(150)
  })

  test('closes when the pointer leaves', async ({ page }) => {
    const button = page.locator('.poveste-toolbar-new-tab')

    await button.hover()
    await expect(page.locator('.poveste-tooltip')).toBeVisible()

    await page.locator('.poveste-app-root').hover({ position: { x: 5, y: 5 } })

    await expect(page.locator('.poveste-tooltip')).toHaveCount(0)
  })
})
