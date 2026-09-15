import { expect, test } from '@playwright/test'

// `__sandbox.html` is a real URL in every published book, so anything holding a
// reference to its window can post to it — most plainly a page that iframes it
// and is therefore its `parent`. The host pins inbound messages to the iframe it
// owns; this is the sandbox's side of the same boundary (#379).
//
// A synthetic `MessageEvent` rather than a second origin: the guard reads
// `event.origin`, which is what a real cross-origin sender sets. Both directions
// run in one `evaluate` because the listener runs synchronously inside
// `dispatchEvent` and `applyPreviewSettings` writes `dir` before returning, so
// there is nothing to wait for. The same-origin half is what makes the other
// one mean anything: without it, a listener that ignored everything would pass.
test('the sandbox ignores a message from another origin and still takes one from its own', async ({ page }) => {
  await page.goto('/__sandbox.html?storyId=conformance-button&variantId=default')
  await expect(page.locator('.__poveste-render-story button').first()).toBeVisible()

  const dir = await page.evaluate(() => {
    const send = (origin: string): string | null => {
      window.dispatchEvent(new MessageEvent('message', {
        origin,
        data: { type: '__poveste:preview-settings-sync', settings: { textDirection: 'rtl' } },
      }))
      return document.documentElement.getAttribute('dir')
    }
    return { foreign: send('https://embedder.example'), own: send(window.location.origin) }
  })

  expect(dir.foreign, 'a message from another origin changed the sandbox').not.toBe('rtl')
  expect(dir.own, 'a message from the book\'s own origin was ignored').toBe('rtl')
})
