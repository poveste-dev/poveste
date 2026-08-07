import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// The example config sets `theme.darkClass: 'my-dark'`, which is what the story
// preview gets when it is dark.
const DARK_CLASS = /my-dark/
// The app chrome uses its own class, driven by the top bar toggle.
const CHROME_DARK_CLASS = /ptw-dark/

const IFRAME_STORY = '/story/src-components-contrastcolor-story-vue?variantId=_default'
// `layout: { type: 'single', iframe: false }` — rendered by the app itself.
const NATIVE_STORY = '/story/src-components-complexparameter-story-vue?variantId=_default'

function sandboxHtml(page: Page) {
  return page.frameLocator('iframe[data-test-id="preview-iframe"]').locator('html')
}

/**
 * `theme.storeColorScheme` defaults to true, so the app scheme lives in
 * localStorage. Seeding it lets a test put the chrome and the preview on
 * opposite schemes.
 */
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

async function pickColorScheme(page: Page, value: 'auto' | 'light' | 'dark') {
  await page.getByTestId('toolbar-background').click()
  await page.getByTestId(`sandbox-color-scheme-${value}`).click()
  await page.getByTestId('toolbar-background').click()
}

test.describe('sandbox color scheme', () => {
  test('follows the OS preference rather than the app scheme', async ({ page }) => {
    await seedChromeScheme(page, 'light')
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(IFRAME_STORY)
    await expect(page.locator('html')).not.toHaveClass(CHROME_DARK_CLASS)
    await expect(sandboxHtml(page)).toHaveClass(DARK_CLASS)

    await page.emulateMedia({ colorScheme: 'light' })
    await expect(sandboxHtml(page)).not.toHaveClass(DARK_CLASS)
  })

  test('pins the preview to light or dark regardless of the OS', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(IFRAME_STORY)

    await pickColorScheme(page, 'light')
    await expect(sandboxHtml(page)).not.toHaveClass(DARK_CLASS)

    await page.emulateMedia({ colorScheme: 'light' })
    await pickColorScheme(page, 'dark')
    await expect(sandboxHtml(page)).toHaveClass(DARK_CLASS)
  })

  test('leaves the app chrome on its own scheme', async ({ page }) => {
    await seedChromeScheme(page, 'dark')
    await page.goto(IFRAME_STORY)
    await expect(page.locator('html')).toHaveClass(CHROME_DARK_CLASS)

    await pickColorScheme(page, 'light')
    await expect(sandboxHtml(page)).not.toHaveClass(DARK_CLASS)
    await expect(page.locator('html')).toHaveClass(CHROME_DARK_CLASS)
  })

  test('applies to stories rendered without an iframe', async ({ page }) => {
    await seedChromeScheme(page, 'dark')
    await page.goto(NATIVE_STORY)
    const story = page.getByTestId('sandbox-render').locator('.poveste-generic-render-story')

    await pickColorScheme(page, 'light')
    await expect(story).not.toHaveClass(DARK_CLASS)

    await pickColorScheme(page, 'dark')
    await expect(story).toHaveClass(DARK_CLASS)
  })

  test('applies to a sandbox opened in its own tab', async ({ page }) => {
    await seedChromeScheme(page, 'light')
    await seedPreviewSettings(page, { colorScheme: 'dark' })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/__sandbox.html?storyId=src-components-contrastcolor-story-vue&variantId=_default')

    await expect(page.locator('html')).toHaveClass(DARK_CLASS)
  })

  test('persists the pick across reloads', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(IFRAME_STORY)
    await pickColorScheme(page, 'dark')
    await expect(sandboxHtml(page)).toHaveClass(DARK_CLASS)

    await page.reload()
    await expect(sandboxHtml(page)).toHaveClass(DARK_CLASS)
    await page.getByTestId('toolbar-background').click()
    await expect(page.getByTestId('sandbox-color-scheme-dark')).toHaveClass(/bg-primary-500/)
  })

  test('reaches users whose settings predate the option', async ({ page }) => {
    await seedPreviewSettings(page, {})
    await seedChromeScheme(page, 'light')
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(IFRAME_STORY)

    await expect(sandboxHtml(page)).toHaveClass(DARK_CLASS)
    await page.getByTestId('toolbar-background').click()
    await expect(page.getByTestId('sandbox-color-scheme-auto')).toHaveClass(/bg-primary-500/)
  })
})
