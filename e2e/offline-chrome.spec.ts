import { expect, test } from '@playwright/test'

/*
 * The chrome used to need the network to draw itself: its icons were fetched
 * from api.iconify.design per boot and its font came through a render-blocking
 * Google Fonts @import. Behind a firewall or offline that was a book with a
 * system font and empty toolbar buttons (#219). Icon data and the font now ship
 * with the app; this boots with every request that leaves the origin aborted
 * and expects the chrome intact.
 *
 * Story icons a user sets (`icon="carbon:bookmark"` on a <Story>) still resolve
 * at runtime, so outbound requests are not asserted to be zero — only that
 * nothing the chrome needs is among them.
 */
const LOCAL = /^https?:\/\/(?:localhost|127\.0\.0\.1)[:/]/
// Icons the toolbar and list draw with, which must never leave the origin.
const CHROME_ICONS = ['search', 'moon', 'sun', 'cube', 'color-palette', 'chevron-sort']

test('the chrome renders with the network unavailable', async ({ page, context }) => {
  const outbound: string[] = []
  await context.route(url => !LOCAL.test(url.href), (route) => {
    outbound.push(route.request().url())
    return route.abort()
  })

  await page.goto('/story/conformance-button')

  await expect(page.getByTestId('toolbar-background').locator('svg').first()).toBeVisible()
  await expect(page.getByTestId('preview-iframe').contentFrame().locator('button').first()).toBeVisible()

  const fonts = outbound.filter(url => /fonts\.(?:googleapis|gstatic)\.com/.test(url))
  expect(fonts, `font requests left the origin: ${fonts.join(', ')}`).toEqual([])

  const chromeIconFetches = outbound.filter(url => /iconify/.test(url) && CHROME_ICONS.some(icon => url.includes(icon)))
  expect(chromeIconFetches, `chrome icons were fetched at runtime: ${chromeIconFetches.join(', ')}`).toEqual([])
})
