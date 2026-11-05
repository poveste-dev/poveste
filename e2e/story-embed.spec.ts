import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openDocs } from './support'

// A live story between the paragraphs of a doc, loaded when it comes near (#444).
const STORY = 'conformance-story-embed'

const embed = (page: Page, id: string) => page.getByTestId('story-docs').locator(`[data-poveste-story="${id}"]`)

test.describe('a story embedded in docs', () => {
  test('shows the variant it names, live', async ({ page }) => {
    await openDocs(page, STORY)

    const buttons = embed(page, 'conformance-huge-grid').locator('iframe').contentFrame().locator('.conformance-huge-grid-button')

    await expect(buttons).toHaveCount(1)
    await expect(buttons).toHaveText('Button 7')
  })

  test('sizes its frame to the story', async ({ page }) => {
    await openDocs(page, STORY)

    const iframe = embed(page, 'conformance-huge-grid').locator('iframe')
    const frame = iframe.contentFrame()
    await expect(frame.locator('.conformance-huge-grid-button')).toBeVisible()

    await expect.poll(async () => {
      const content = await frame.locator('body').evaluate(body => Math.ceil(body.getBoundingClientRect().height))
      const box = await iframe.boundingBox()
      return Math.abs(content - (box?.height ?? 0))
    }).toBeLessThanOrEqual(1)
  })

  test('leaves the text after it outside the embed', async ({ page }) => {
    await openDocs(page, STORY)

    await expect(page.getByTestId('story-docs').locator('> p', { hasText: 'After the embed.' })).toBeVisible()
  })

  test('says so when the story isn\'t there', async ({ page }) => {
    await openDocs(page, STORY)

    await expect(embed(page, 'conformance-no-such-story')).toContainText('conformance-no-such-story')
  })

  // Mounting a preview marks its variant not ready, which on the open variant took the
  // docs pane away, and the embed with it, for good.
  test('can show the variant the book has open', async ({ page }) => {
    await openDocs(page, STORY)

    await expect(embed(page, STORY).locator('iframe').contentFrame().locator('.conformance-story-embed-text')).toBeVisible()
    await expect(page.getByTestId('story-docs').locator('h1')).toContainText('Story embed')
  })

  test('boots a sandbox only when it comes near, and takes the first variant by default', async ({ page }) => {
    await openDocs(page, STORY)
    await expect(embed(page, 'conformance-huge-grid').locator('iframe').contentFrame().locator('.conformance-huge-grid-button')).toBeVisible()

    const far = embed(page, 'conformance-docs')
    await expect(far.getByTestId('story-embed')).toBeAttached()
    await expect(far.locator('iframe')).toHaveCount(0)

    await far.scrollIntoViewIfNeeded()

    await expect(far.locator('iframe').contentFrame().locator('.conformance-docs-text')).toBeVisible()
  })
})
