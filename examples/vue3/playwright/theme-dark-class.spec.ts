import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// Stays per-example: it asserts a book with a *custom* `theme.darkClass` gets
// that class and not the legacy `dark`. A book on the default cannot express
// that, so this cannot join the shared suite (#89).
const DARK_CLASS = /my-dark/

const IFRAME_STORY = '/story/conformance-contrast'
const NATIVE_STORY = '/story/conformance-no-iframe'
const INLINE_GRID_STORY = '/story/conformance-inline-grid'

function sandboxHtml(page: Page) {
  return page.getByTestId('preview-iframe').contentFrame().locator('html')
}

function seedChromeScheme(page: Page, scheme: 'light' | 'dark') {
  return page.addInitScript((value) => {
    localStorage.setItem('poveste-color-scheme', value)
  }, scheme)
}

function seedPreviewSettings(page: Page, settings: Record<string, unknown>) {
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

test.describe('custom theme.darkClass', () => {
  const DARK_PATHS = [
    { path: 'inline single preview', url: NATIVE_STORY, story: (page: Page) => page.getByTestId('sandbox-render').locator('.poveste-generic-render-story') },
    { path: 'inline grid cell', url: INLINE_GRID_STORY, story: (page: Page) => page.locator('.poveste-story-variant-grid-item .poveste-generic-render-story').first() },
    { path: 'sandbox iframe', url: IFRAME_STORY, story: sandboxHtml },
  ]

  for (const { path, url, story } of DARK_PATHS) {
    test(`applies on the ${path}`, async ({ page }) => {
      await seedChromeScheme(page, 'dark')
      await seedPreviewSettings(page, { colorScheme: 'dark' })
      await page.goto(url)
      // Auto-retries until the sandbox has booted and applied it.
      await expect(story(page)).toHaveClass(DARK_CLASS)

      const classes = await story(page).evaluate(el => [...el.classList])

      expect(classes).toContain('my-dark')
      // The deprecated `sandboxDarkClass`. `ptw-dark` is the chrome's own class
      // and legitimately reaches the sandbox document, so this is exact.
      expect(classes).not.toContain('dark')
    })
  }
})
