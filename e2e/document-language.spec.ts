import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

/*
 * `html-has-lang` is WCAG 3.1.1 Level A, and both documents here are ones
 * poveste writes rather than the user — so a book could not carry a language
 * however much its author wanted one (#299).
 *
 * Asserted on what is served, not on the template: there are three of those (the
 * build, the dev shell, the dev sandbox) and they had already drifted, which is
 * how one book shipped without the empty description tag the other five had.
 */
const STORY = 'conformance-button'

test.describe('the document language', () => {
  test('is declared on the book shell', async ({ page }) => {
    await openStory(page, STORY)

    await expect(page.locator('html')).toHaveAttribute('lang', /\S/)
  })

  // The sandbox is where every variant renders, so an axe run reports against
  // this document rather than the shell (#162).
  test('is declared on the sandbox a variant renders into', async ({ page }) => {
    await openStory(page, STORY)

    await expect(page.getByTestId('preview-iframe').contentFrame().locator('html'))
      .toHaveAttribute('lang', /\S/)
  })

  // An empty description reads as "this page has no description" rather than
  // falling back to the content, so the tag is omitted instead.
  test('carries no empty description', async ({ page }) => {
    await openStory(page, STORY)

    await expect(page.locator('meta[name="description"][content=""]')).toHaveCount(0)
  })
})
