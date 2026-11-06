import { expect, test } from '@playwright/test'
import { expectPlainSource, openStory, openStoryInApp, removeResponseBytes, sandboxHtml } from './support.js'

const STORY = 'conformance-button'

// CI's browser has `Response.prototype.bytes`, and Chrome before 132 and Safari before 18
// don't. Shiki 4.6 calls it as its Wasm module loads, and a throw there took the story
// view with it, so nothing but a browser without it could notice (#1632).
test.describe('a browser without `Response.prototype.bytes`', () => {
  test.beforeEach(async ({ page }) => {
    await removeResponseBytes(page)
  })

  test('opens a story by its URL, with the source in plain text', async ({ page }) => {
    const errors: Error[] = []
    page.on('pageerror', error => errors.push(error))

    const plainSource = expectPlainSource(page)
    await openStory(page, STORY)

    expect(await page.evaluate(() => 'bytes' in Response.prototype)).toBe(false)
    await expect(page.locator('.poveste-toolbar-title')).toContainText('Button')
    await expect(sandboxHtml(page)).toContainText('Click me', { timeout: 20_000 })
    await plainSource
    expect(errors).toEqual([])
  })

  // Shiki keeps the failed load, so a later story gets the same rejection. Importing the
  // module again for it left an import nothing was waiting on, which rejected uncaught.
  test('stays quiet as the reader opens more stories', async ({ page }) => {
    const errors: Error[] = []
    page.on('pageerror', error => errors.push(error))
    await page.goto('/')

    for (const title of ['Button', 'Contrast', 'Events']) {
      const plainSource = expectPlainSource(page)
      await openStoryInApp(page, title)
      await plainSource
    }

    expect(errors).toEqual([])
  })

  test('opens a story by clicking it from the home page', async ({ page }) => {
    await page.goto('/')

    await openStoryInApp(page, 'Button')

    await expect(page).toHaveURL(new RegExp(`/story/${STORY}`))
    await expect(sandboxHtml(page)).toContainText('Click me', { timeout: 20_000 })
  })
})
