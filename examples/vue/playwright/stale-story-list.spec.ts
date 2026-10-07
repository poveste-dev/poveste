import { expect, test } from '@playwright/test'

// A page that loaded the story list mid-collection, and was still loading when
// collection ended, missed the update that carried the rest: neither it nor
// `poveste:all-stories-loaded` is replayed. It kept that partial list, with no
// preview and no error, until a reload (#1218).
//
// The race is milliseconds wide, so this serves the page the state it leaves: an
// empty list from a generation the server has already moved past.
const LIST = '__resolved__virtual:$poveste-stories'

test('a page holding a stale story list is sent the current one when it mounts', async ({ page }) => {
  // The server has to be past its first collection, whose own broadcast would
  // otherwise reach the page and make the test pass without the fix.
  await expect.poll(async () => (await (await page.request.get(`/${LIST}`)).text()).match(/export let generation = (\d+)/)?.[1], { timeout: 60_000 })
    .toMatch(/^[1-9]/)

  let mounted = false
  // Every copy the page loads before it mounts is stale, so a reload from the
  // dependency optimizer cannot hand it the real list either.
  await page.route(url => url.pathname.endsWith(LIST), async (route) => {
    if (mounted) {
      return route.continue()
    }
    const response = await route.fetch()
    const body = (await response.text())
      .replace(/export let files = \[[\s\S]*?\]\nexport let tree = [^\n]*\n/, 'export let files = []\nexport let tree = []\n')
      .replace(/export let generation = \d+/, 'export let generation = -1')
    // Uncacheable, or the sandbox's request for the same URL revalidates against
    // the real ETag and is handed this copy from the cache.
    const { etag: _etag, ...headers } = response.headers()
    await route.fulfill({ response, body, headers: { ...headers, 'cache-control': 'no-store' } })
  })

  // A mount after the server's first one also re-collects, and the broadcast at
  // the end of that collection would rescue the page with or without the fix. A
  // full collection always starts by reporting progress, so from that frame on
  // nothing more is let through: only what the mount itself is sent can count.
  let recollecting = false
  await page.routeWebSocket(/.*/, (ws) => {
    const server = ws.connectToServer()
    ws.onMessage((message) => {
      if (String(message).includes('poveste:mount')) {
        mounted = true
      }
      server.send(message)
    })
    server.onMessage((message) => {
      recollecting ||= String(message).includes('poveste:stories-loading-progress')
      if (!recollecting) {
        ws.send(message)
      }
    })
  })

  await page.goto('/story/conformance-button')

  await expect(page.getByTestId('preview-iframe').contentFrame().getByRole('button', { name: 'Click me' })).toBeVisible()
})
