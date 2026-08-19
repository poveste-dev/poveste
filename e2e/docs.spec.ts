import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openDocs } from './support'

const DOCS_STORY = 'conformance-docs'

test.describe('story docs', () => {
  test('renders the docs panel for a story variant', async ({ page }) => {
    await openDocs(page, DOCS_STORY)

    const docs = page.getByTestId('story-docs')
    await expect(docs.locator('h1')).toContainText('Title 1')
    await expect(docs.locator('h2')).toContainText('Title 2')
    await expect(docs.locator('a').filter({ hasText: 'Link' }).first()).toBeVisible()
  })

  /*
   * A markdown code block is a `not-prose` island inside the `<pre><code>`
   * markdown-it wraps around it, so three rules have to stay out of it: the
   * prose `code` pill on shiki's `code`, the same pill on the wrapping `code`,
   * and the absolutely positioned language label. All three broke independently
   * in the Tailwind v4 upgrade and the docs still rendered — nothing short of
   * asserting the computed styles notices.
   */
  test('keeps prose styling out of markdown code blocks', async ({ page }) => {
    await openDocs(page, DOCS_STORY)

    const block = page.locator('.__poveste-code').first()
    await expect(block).toHaveCSS('position', 'relative')
    await expect(block.locator('> div').first()).toHaveCSS('position', 'absolute')

    // Any highlighted language: each book's docs show its own framework, so
    // pinning one would put a Vue snippet in the Svelte books.
    for (const code of [block.locator('pre code'), page.locator('pre > code[class*="language-"]').first()]) {
      await expect(code).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await expect(code).toHaveCSS('padding', '0px')
    }

    // Inline code keeps the pill it is supposed to have.
    const inline = page.locator('.prose p code').first()
    await expect(inline).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(inline).not.toHaveCSS('padding', '0px')
  })

  /*
   * `not-prose` is typography's documented escape hatch and has to opt out of
   * poveste's overrides too. Separate from the code-block test: a code block is
   * a `not-prose` island, but everything inside one also sits in a `pre`, so
   * that test passes with the guard removed entirely.
   */
  test('honours not-prose in markdown', async ({ page }) => {
    await openDocs(page, DOCS_STORY)

    const linkColor = (locator: ReturnType<Page['locator']>) =>
      locator.evaluate(el => getComputedStyle(el).color)

    const proseLink = page.locator('#prose-link')
    const escaped = page.locator('#not-prose-island a')

    await expect(proseLink).toBeVisible()
    await expect(escaped).toBeVisible()
    expect(await linkColor(escaped)).not.toBe(await linkColor(proseLink))
  })
})
