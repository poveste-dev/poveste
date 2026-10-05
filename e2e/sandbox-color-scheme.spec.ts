import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { sandboxHtml, seedChromeScheme, seedPreviewSettings } from './support'

// `theme.darkClass` is per-book config — vue sets `my-dark`, the rest take the
// default — so a shared spec matches either rather than pinning one book's.
const DARK_CLASS = /(?:^|\s)(?:my-)?dark(?:\s|$)/
// The app chrome uses its own class, driven by the top bar toggle.
const CHROME_DARK_CLASS = /ptw-dark/

const IFRAME_STORY = '/story/conformance-contrast'
// Styles itself the ordinary `darkMode: 'class'` way, so it fails if the class
// is present but unreachable.
const DARK_STORY = '/story/conformance-dark'
// `iframe: false` — rendered by the app itself.
const NATIVE_STORY = '/story/conformance-no-iframe'
// Grid cells rendered by the app rather than one sandbox each — the third
// render path (#126).
const INLINE_GRID_STORY = '/story/conformance-inline-grid'
// A range, number, date, checkbox and select, which the browser paints itself.
const NATIVE_WIDGETS_STORY = '/story/conformance-native-widgets'
const WIDGETS = ['range', 'number', 'date', 'checkbox', 'select']
// Pins its own root to `light` with a book rule, in an iframe and without one.
const OWN_SCHEME_STORY = '/story/conformance-own-color-scheme'
const OWN_SCHEME_NATIVE_STORY = '/story/conformance-own-color-scheme-no-iframe'

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
  test('applies to a sandbox opened in its own tab', async ({ page }) => {
    await seedChromeScheme(page, 'light')
    await seedPreviewSettings(page, { colorScheme: 'dark' })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/__sandbox.html?storyId=conformance-contrast&variantId=default')

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
    await expect(story.locator('.conformance-dark-only')).toBeVisible()
    await expect(story.locator('.conformance-dark-text')).toHaveCSS('color', 'rgb(255, 255, 255)')
    await expect(story.locator('.conformance-dark-text')).toHaveCSS('font-weight', '700')

    await pickColorScheme(page, 'light')
    await expect(story.locator('.conformance-dark-only')).toBeHidden()
    await expect(story.locator('.conformance-dark-text')).not.toHaveCSS('color', 'rgb(255, 255, 255)')
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

/*
 * The CSS `color-scheme` property, which is what the browser reads: native
 * widgets, scrollbars and the canvas are painted from it and from no class, so
 * every test above can pass while a dark story shows light form controls (#991).
 */
test.describe('the color-scheme the browser is told', () => {
  test('reaches every native widget in the sandbox, in each scheme', async ({ page }) => {
    await page.goto(NATIVE_WIDGETS_STORY)
    const story = page.getByTestId('preview-iframe').contentFrame()

    for (const [pick, expected] of [['dark', 'dark'], ['light', 'light'], ['auto', 'light dark']] as const) {
      await pickColorScheme(page, pick)
      for (const widget of WIDGETS) {
        await expect(story.locator(`[data-widget="${widget}"]`), `${widget} under ${pick}`).toHaveCSS('color-scheme', expected)
      }
    }
  })

  test('reaches a story rendered without an iframe, on its own root', async ({ page }) => {
    await seedChromeScheme(page, 'light')
    await page.goto(NATIVE_STORY)
    const story = page.getByTestId('sandbox-render').locator('.poveste-generic-render-story')

    await pickColorScheme(page, 'dark')
    await expect(story).toHaveCSS('color-scheme', 'dark')

    await pickColorScheme(page, 'light')
    await expect(story).toHaveCSS('color-scheme', 'light')
  })

  test('reaches grid cells rendered without an iframe', async ({ page }) => {
    await seedChromeScheme(page, 'light')
    await page.goto(INLINE_GRID_STORY)
    const cell = page.locator('.poveste-story-variant-grid-item .poveste-generic-render-story').first()
    await expect(cell).toBeVisible()

    await pickColorScheme(page, 'dark')
    await expect(cell).toHaveCSS('color-scheme', 'dark')
  })

  test('leaves the chrome on the chrome\'s own scheme', async ({ page }) => {
    await seedChromeScheme(page, 'dark')
    await page.goto(IFRAME_STORY)
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')

    await pickColorScheme(page, 'light')
    await expect(sandboxHtml(page)).toHaveCSS('color-scheme', 'light')
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')
  })
})

/*
 * poveste's value is a default, not an override: a book that declares
 * `color-scheme` on its root keeps it. Set inline, poveste's won on every path,
 * so a design system theming its root lost its scheme (#1167).
 *
 * The book's rule reaches the sandbox `<html>` in a built book and the story's
 * scope root in dev, so these assert what holds on both.
 */
test.describe('a book that declares its own color-scheme', () => {
  test('keeps it in a sandbox, over the preview setting', async ({ page }) => {
    await seedPreviewSettings(page, { colorScheme: 'dark' })
    await page.goto(OWN_SCHEME_STORY)
    const story = page.getByTestId('preview-iframe').contentFrame()

    await expect(story.locator('[data-widget="checkbox"]')).toHaveCSS('color-scheme', 'light')
  })

  // Only the sandbox can see that the book won, so the element follows what it reports.
  test('has the iframe element declare what the sandbox root computed', async ({ page }) => {
    await seedPreviewSettings(page, { colorScheme: 'dark' })
    await page.goto(OWN_SCHEME_STORY)
    const frame = page.getByTestId('preview-iframe')
    await expect(frame.contentFrame().locator('[data-widget="checkbox"]')).toHaveCSS('color-scheme', 'light')

    const rootScheme = await frame.contentFrame().locator('html').evaluate(el => getComputedStyle(el).colorScheme)
    await expect(frame).toHaveCSS('color-scheme', rootScheme)
  })

  test('keeps it in a story rendered without an iframe', async ({ page }) => {
    await seedChromeScheme(page, 'dark')
    await seedPreviewSettings(page, { colorScheme: 'dark' })
    await page.goto(OWN_SCHEME_NATIVE_STORY)
    const story = page.getByTestId('sandbox-render').locator('.poveste-generic-render-story')

    await expect(story.locator('[data-widget="checkbox"]')).toHaveCSS('color-scheme', 'light')
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')
  })
})

/*
 * What is painted, not what is declared. Where a sandbox root's `color-scheme`
 * differs from the `<iframe>` element's, the browser paints the frame opaque,
 * hiding the background preset and checkerboard behind it. Every property
 * assertion above held throughout (#1167).
 *
 * Compares a point of the preview with the same point once the frame is hidden,
 * so it holds for any preset: a transparent frame shows exactly what is behind
 * it. Decoded by the page, so the spec needs no PNG library.
 */
test.describe('what the preview paints over its background', () => {
  async function pixel(page: Page, x: number, y: number) {
    const png = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 } })
    return page.evaluate(async (data) => {
      const image = new Image()
      image.src = `data:image/png;base64,${data}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)]
    }, png.toString('base64'))
  }

  // Right of the content and clear of it, in both a full preview and a grid cell.
  async function shownAndBehind(page: Page, frame: Locator) {
    const box = (await frame.boundingBox())!
    const [x, y] = [box.x + box.width - 4, box.y + box.height / 2]
    const shown = await pixel(page, x, y)
    await frame.evaluate((el: HTMLElement) => el.style.setProperty('visibility', 'hidden'))
    const behind = await pixel(page, x, y)
    await frame.evaluate((el: HTMLElement) => el.style.removeProperty('visibility'))
    return { shown, behind }
  }

  const CASES = [
    { chrome: 'dark', os: 'light', preview: 'light', backgroundColor: 'transparent', checkerboard: true },
    { chrome: 'dark', os: 'light', preview: 'light', backgroundColor: '#333', checkerboard: false },
    { chrome: 'light', os: 'dark', preview: 'auto', backgroundColor: '#aaa', checkerboard: false },
    // The two agree, so this held before the fix too: it proves the method.
    { chrome: 'dark', os: 'light', preview: 'dark', backgroundColor: '#333', checkerboard: false },
  ] as const

  // The book's rule beats the preview setting, so an element following the
  // setting would mismatch the root it embeds.
  test('shows the background through a preview whose book pins its own scheme', async ({ page }) => {
    await seedChromeScheme(page, 'dark')
    await seedPreviewSettings(page, { colorScheme: 'dark', backgroundColor: '#333', checkerboard: false })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(OWN_SCHEME_STORY)
    const frame = page.getByTestId('preview-iframe')
    await expect(frame.contentFrame().locator('[data-widget="checkbox"]')).toHaveCSS('color-scheme', 'light')
    const rootScheme = await frame.contentFrame().locator('html').evaluate(el => getComputedStyle(el).colorScheme)
    await expect(frame).toHaveCSS('color-scheme', rootScheme)

    const { shown, behind } = await shownAndBehind(page, frame)
    expect(shown).toEqual(behind)
  })

  for (const { chrome, os, preview, backgroundColor, checkerboard } of CASES) {
    const name = `interface ${chrome}, preview ${preview} on a ${os} OS, ${checkerboard ? 'checkerboard' : backgroundColor}`

    test(`shows the background through a full preview: ${name}`, async ({ page }) => {
      await seedChromeScheme(page, chrome)
      await seedPreviewSettings(page, { colorScheme: preview, backgroundColor, checkerboard })
      await page.emulateMedia({ colorScheme: os })
      await page.goto(IFRAME_STORY)
      const frame = page.getByTestId('preview-iframe')
      await expect(frame.contentFrame().locator('.conformance-contrast')).toBeVisible()
      await expect(frame).toBeVisible()

      const { shown, behind } = await shownAndBehind(page, frame)
      expect(shown).toEqual(behind)
    })

    test(`shows the background through a grid cell: ${name}`, async ({ page }) => {
      await seedChromeScheme(page, chrome)
      await seedPreviewSettings(page, { colorScheme: preview, backgroundColor, checkerboard })
      await page.emulateMedia({ colorScheme: os })
      await page.goto('/story/conformance-grid')
      const frame = page.getByTestId('preview-iframe').first()
      await expect(frame.contentFrame().locator('.conformance-text')).toBeVisible()
      await expect(frame).toBeVisible()

      const { shown, behind } = await shownAndBehind(page, frame)
      expect(shown).toEqual(behind)
    })
  }
})
