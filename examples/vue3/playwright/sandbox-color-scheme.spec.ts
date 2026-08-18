import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// The example config sets `theme.darkClass: 'my-dark'`, which is what the story
// preview gets when it is dark.
const DARK_CLASS = /my-dark/
// The app chrome uses its own class, driven by the top bar toggle.
const CHROME_DARK_CLASS = /ptw-dark/

const IFRAME_STORY = '/story/src-components-contrastcolor-story-vue?variantId=_default'
// Styles itself with `.dark .meow` / `.dark .only-dark`, i.e. the ordinary
// `darkMode: 'class'` shape, so it fails if the class is present but unreachable.
const DARK_STORY = '/story/src-components-darkmode-story-vue?variantId=src-components-darkmode-story-vue-0'
// `layout: { type: 'single', iframe: false }` — rendered by the app itself.
const NATIVE_STORY = '/story/src-components-complexparameter-story-vue?variantId=_default'
// `iframeGrid: false` — grid cells rendered by the app rather than one sandbox
// each, which is the third render path (#126).
const INLINE_GRID_STORY = '/story/src-components-inlinegrid-story-vue'

function sandboxHtml(page: Page) {
  return page.getByTestId('preview-iframe').contentFrame().locator('html')
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

  test('applies to grid cells rendered without an iframe', async ({ page }) => {
    await seedChromeScheme(page, 'dark')
    await page.goto(INLINE_GRID_STORY)
    const cell = page.locator('.poveste-story-variant-grid-item .poveste-generic-render-story').first()
    await expect(cell).toBeVisible()

    await pickColorScheme(page, 'light')
    await expect(cell).not.toHaveClass(DARK_CLASS)

    await pickColorScheme(page, 'dark')
    await expect(cell).toHaveClass(DARK_CLASS)
  })

  // #126. The grid emitted `theme.darkClass` alone while the other two also
  // emitted the deprecated `sandboxDarkClass`, defaulted to `dark`.
  const DARK_PATHS = [
    { path: 'inline single preview', url: NATIVE_STORY, story: (page: Page) => page.getByTestId('sandbox-render').locator('.poveste-generic-render-story') },
    { path: 'inline grid cell', url: INLINE_GRID_STORY, story: (page: Page) => page.locator('.poveste-story-variant-grid-item .poveste-generic-render-story').first() },
    { path: 'sandbox iframe', url: IFRAME_STORY, story: sandboxHtml },
  ]

  for (const { path, url, story } of DARK_PATHS) {
    test(`applies theme.darkClass alone on the ${path}`, async ({ page }) => {
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

  /*
   * Asserts the *effect* of the scheme, not just the class. Every other test in
   * this file checks that the dark class is present on the sandbox, and all of
   * them passed throughout #101, where the class was applied and did nothing.
   *
   * Read the scope of this honestly: it does **not** guard #101. That bug only
   * reproduces under `poveste dev`, because user CSS is `@scope`-wrapped in dev
   * and shipped unwrapped in a built book. This suite runs against
   * `poveste preview`, so it exercises the path that was never broken. Verified
   * by reverting the fix: this test still passed.
   *
   * It earns its place by guarding the built path against the same class of
   * regression, and by making the dev-mode gap explicit rather than implied.
   */
  test('makes the scheme reach the story\'s own CSS, not just its class list', async ({ page }) => {
    await page.goto(DARK_STORY)
    const story = page.getByTestId('preview-iframe').contentFrame()

    await pickColorScheme(page, 'dark')
    await expect(story.locator('.only-dark')).toBeVisible()
    await expect(story.locator('.meow')).toHaveCSS('color', 'rgb(255, 255, 255)')
    await expect(story.locator('.meow')).toHaveCSS('font-weight', '700')

    await pickColorScheme(page, 'light')
    await expect(story.locator('.only-dark')).toBeHidden()
    await expect(story.locator('.meow')).not.toHaveCSS('color', 'rgb(255, 255, 255)')
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
