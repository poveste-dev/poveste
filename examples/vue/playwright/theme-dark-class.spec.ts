import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { sandboxHtml, seedChromeScheme, seedPreviewSettings } from '../../../e2e/support'

// Stays per-example: it asserts a book with a *custom* `theme.darkClass` gets
// that class and not the legacy `dark`. A book on the default cannot express
// that, so this cannot join the shared suite (#89).
const DARK_CLASS = /my-dark/

const IFRAME_STORY = '/story/conformance-contrast'
const NATIVE_STORY = '/story/conformance-no-iframe'
const INLINE_GRID_STORY = '/story/conformance-inline-grid'

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
