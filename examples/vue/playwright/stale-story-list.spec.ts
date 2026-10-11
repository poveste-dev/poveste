import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'

// A page that loaded the story list mid-collection, and was still loading when
// collection ended, missed the update that carried the rest: neither it nor
// `poveste:all-stories-loaded` is replayed. It kept that partial list, with no
// preview and no error, until a reload (#1218).
//
// The race is milliseconds wide, so this serves the page the state it leaves: an
// empty list from a generation the server has already moved past.
const LIST = '__resolved__virtual:$poveste-stories'

// Both tests need the server's list to change only when they change it.
test.describe.configure({ mode: 'serial' })

test('a page holding a stale story list is sent the current one when it mounts', async ({ page }) => {
  // The server has to be past its first collection, and done with any other,
  // or that collection's own broadcast reaches the page and the test passes
  // without the fix. The generation moves when a collection ends.
  const generation = async () => (await (await page.request.get(`/${LIST}`)).text()).match(/export let generation = (\d+)/)?.[1]
  await expect.poll(generation, { timeout: 60_000 }).toMatch(/^[1-9]/)
  let last: string | undefined
  await expect.poll(async () => {
    const now = await generation()
    const settled = now === last
    last = now
    return settled
  }, { intervals: [1_000], timeout: 30_000 }).toBe(true)

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
  // full collection opens by reporting zero files loaded, so from that frame on
  // nothing more is let through: only what the mount itself is sent can count. A
  // collection already running when the page connected reports more than zero,
  // and muting on it would also mute the reply this waits for.
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
      const frame = JSON.parse(String(message))
      recollecting ||= mounted && frame.event === 'poveste:stories-loading-progress' && frame.data?.loadedFileCount === 0
      if (!recollecting) {
        ws.send(message)
      }
    })
  })

  await page.goto('/story/conformance-button')

  await expect(page.getByTestId('preview-iframe').contentFrame().getByRole('button', { name: 'Click me' })).toBeVisible()
})

// The page's importers of the list are each stamped with the list's version when
// the server serves them. A list that changes between two of them gives the page
// two copies, and the one evaluated last takes over the hot update. The handlers
// were kept per copy, so the page then applied every update to a copy nobody was
// watching: "hot updated" in the console, and a sidebar that never changed. That
// is what the markdown rename test hit in one CI job in six (#1237).
const TMP = resolve(import.meta.dirname, '../src/e2e-tmp')

function story(id: string, title: string) {
  return `<template>
  <Story id="${id}" title="${title}">
    <Variant id="only" title="Only">
      <span>${title}</span>
    </Variant>
  </Story>
</template>
`
}

test('a page holding two copies of the story list still takes updates', async ({ page }) => {
  const served = async () => (await (await page.request.get(`/${LIST}`)).text())
  const copies = new Set<string>()
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.endsWith(LIST)) {
      copies.add(url.search)
    }
  })

  await mkdir(TMP, { recursive: true })
  let held = false
  // The entry is served by now, stamped with the list as it stood. The list is
  // changed before the next importer is served, so that one is stamped with the
  // list that follows.
  await page.route(/App\.vue_vue_type_script_setup_true_lang\.js/, async (route) => {
    if (!held) {
      held = true
      await writeFile(join(TMP, 'SplitFirst.story.vue'), story('e2e-split-first', 'Split first'))
      await expect.poll(async () => (await served()).includes('e2e-split-first'), { timeout: 30_000 }).toBe(true)
    }
    await route.continue()
  })

  try {
    await page.goto('/')
    const item = (title: string) => page.getByTestId('story-list-item').filter({ hasText: title })
    await expect(item('Split first')).toBeVisible()
    expect(copies.size, 'the page loaded two copies of the list').toBeGreaterThan(1)

    await writeFile(join(TMP, 'SplitSecond.story.vue'), story('e2e-split-second', 'Split second'))

    await expect(item('Split second')).toBeVisible({ timeout: 30_000 })
  }
  finally {
    await rm(TMP, { recursive: true, force: true })
  }
})
