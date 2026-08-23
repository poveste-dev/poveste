import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

// Not a `.spec.ts`, so Playwright does not collect it as a test file.

/**
 * How long a book gets to boot, and a story to render in it, before that counts
 * as a failure rather than a slow machine (#75).
 *
 * These are ceilings, not waits — both return the moment the thing appears, so
 * a healthy run is unaffected. They are generous because the alternative is a
 * suite that reds under load and trains everyone to re-run it; the shell one is
 * the larger because nuxt4 is several times slower to start than the rest
 * (#220), and it is the book that failed when this was measured.
 */
const BOOK_LOAD_TIMEOUT = 60_000
const STORY_RENDER_TIMEOUT = 20_000

export function sandboxHtml(page: Page) {
  return page.getByTestId('preview-iframe').contentFrame().locator('html')
}

/**
 * `theme.storeColorScheme` defaults to true, so the app scheme lives in
 * localStorage. Seeding it lets a test put the chrome and the preview on
 * opposite schemes.
 */
export function seedChromeScheme(page: Page, scheme: 'light' | 'dark') {
  return page.addInitScript((value) => {
    localStorage.setItem('poveste-color-scheme', value)
  }, scheme)
}

export function seedPreviewSettings(page: Page, settings: Record<string, unknown>) {
  return page.addInitScript((value) => {
    localStorage.setItem('_poveste-sandbox-settings-v3', JSON.stringify({
      responsiveWidth: 720,
      responsiveHeight: null,
      rotate: false,
      backgroundColor: '#fff',
      backgroundColorPicked: true,
      checkerboard: false,
      textDirection: 'ltr',
      ...value,
    }))
  }, settings)
}

/**
 * The contract stories are normal stories, so their markdown lives in the Docs
 * panel rather than being the page.
 */
export async function openDocs(page: Page, storyId: string) {
  await page.goto(`/story/${storyId}`)
  await page.getByTestId('story-side-panel').getByRole('link', { name: 'Docs' }).click()
}

/**
 * Open a story by id, and fail on the story rather than on whatever the spec
 * does next.
 *
 * An id that resolves to nothing is not an error here: the app renders the
 * sidebar and an empty shell — no toolbar title, no preview iframe — so every
 * assertion after it fails on a missing selector instead. That reads as a broken
 * feature when it is really a story renamed, moved, or never added to this
 * framework's example. Since these specs run against four books at once, the
 * same mistake is four confusing failures.
 */
export async function openStory(page: Page, id: string, query = '') {
  await page.goto(`/story/${id}${query}`)

  // Booting the book — fetching its story list, rendering the shell — is a page
  // load, and the default an assertion waits is meant for an element that is
  // already on its way. Oversubscribe the workers and the slowest book outruns
  // it, which is #75: the failure lands on whichever spec was unlucky, so it
  // reads as a different flaky test each time and never reproduces alone.
  //
  // Waiting for the shell separately keeps that apart from the story itself, so
  // a story that really is missing still fails on the message below rather than
  // on a timeout that could mean either.
  await expect(
    page.locator('[data-testid="story-list-item"]').first(),
    'the book did not finish loading',
  ).toBeVisible({ timeout: BOOK_LOAD_TIMEOUT })

  await expect(
    page.locator('.poveste-toolbar-title'),
    `story "${id}" is missing from this book`,
  ).toBeVisible({ timeout: STORY_RENDER_TIMEOUT })
}
