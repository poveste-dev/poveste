import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

// Not a `.spec.ts`, so Playwright does not collect it as a test file.

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

  await expect(
    page.locator('.poveste-toolbar-title'),
    `story "${id}" is missing from this book`,
  ).toBeVisible()
}
