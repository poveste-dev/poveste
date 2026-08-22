import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { expect, test } from '@playwright/test'

// A sandbox opened on its own — the toolbar's new-tab button, a pasted URL — has
// no app around it to wait for the story list. In dev that list is empty until
// the server's first collect lands, and `__sandbox.html` is served before then;
// the sandbox used to read the empty list, throw at module top level, and stay
// blank when the list arrived over HMR.
//
// Whether a plain `goto` lands in that window depends on how soon after the
// server came up the test runs, so the second test makes the window itself: it
// opens a sandbox for a story that does not exist yet and only then creates the
// story file. Pre-fix that order is the same failure — a list without the story
// at boot, and the story arriving through `onUpdate` afterwards. Only a dev
// server can deliver that: a built book's list is static, so there the second
// test skips and the first stands on its own.
const BARE_URL = '/__sandbox.html?storyId=conformance-huge-grid&variantId=v7'

const LATE_STORY_ID = 'e2e-late-arrival'
const LATE_STORY_FILE = resolve(import.meta.dirname, '../src/e2e-tmp/LateArrival.story.vue')
const LATE_STORY_SOURCE = `<template>
  <Story id="${LATE_STORY_ID}" title="E2E/Late arrival">
    <Variant id="only" title="Only">
      <span class="e2e-late-arrival">late arrival</span>
    </Variant>
  </Story>
</template>
`

test.describe('bare sandbox URL in dev', () => {
  test('renders the variant it names', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))

    await page.goto(BARE_URL)
    await expect(page.locator('.conformance-huge-grid-button')).toHaveText('Button 7')
    expect(errors).toEqual([])
  })

  test('waits for a story the list does not have yet', async ({ page }) => {
    test.skip(!/(?:^|:)dev$/.test(test.info().project.name), 'the story list is static in a built book')

    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))

    await page.goto(`/__sandbox.html?storyId=${LATE_STORY_ID}&variantId=only`)
    // Nothing to render yet, and nothing to throw about either.
    await expect(page.locator('.e2e-late-arrival')).toHaveCount(0)
    expect(errors).toEqual([])

    await mkdir(dirname(LATE_STORY_FILE), { recursive: true })
    await writeFile(LATE_STORY_FILE, LATE_STORY_SOURCE)
    try {
      // Watcher → collect → HMR update, so this is the one slow wait here.
      await expect(page.locator('.e2e-late-arrival')).toHaveText('late arrival', { timeout: 30_000 })
      expect(errors).toEqual([])
    }
    finally {
      await rm(dirname(LATE_STORY_FILE), { recursive: true, force: true })
    }
  })
})
