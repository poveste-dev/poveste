import { expect, test } from '@playwright/test'

test.describe('story docs', () => {
  test('renders the docs panel for a story variant', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('story-list-item').filter({ hasText: 'Demo' }).click()
    await page.getByTestId('story-variant-list-item').filter({ hasText: 'untitled' }).click()
    await page.getByTestId('story-side-panel').getByRole('link', { name: 'Docs' }).click()

    const docs = page.getByTestId('story-docs')
    await expect(docs.locator('h1')).toContainText('Title 1')
    await expect(docs.locator('h2')).toContainText('Title 2')
    await expect(docs.locator('a').filter({ hasText: 'Link' })).toBeVisible()
  })

  /*
   * A markdown code block is a `not-prose` island sitting inside the
   * `<pre><code>` markdown-it wraps around it, so three different rules have to
   * stay out of it: the prose `code` pill on shiki's `code`, the same pill on
   * the wrapping `code`, and the absolutely positioned language label. All
   * three broke independently in the Tailwind v4 upgrade, and the docs still
   * rendered — nothing short of asserting the computed styles notices.
   */
  test('keeps prose styling out of markdown code blocks', async ({ page }) => {
    await page.goto('/story/src-longfile1-story-js')

    const block = page.locator('.__poveste-code').first()
    await expect(block).toHaveCSS('position', 'relative')
    await expect(block.locator('> div').first()).toHaveCSS('position', 'absolute')

    for (const code of [block.locator('pre code'), page.locator('pre > code.language-vue').first()]) {
      await expect(code).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await expect(code).toHaveCSS('padding', '0px')
    }

    // Inline code keeps the pill it is supposed to have.
    const inline = page.locator('.prose p code').first()
    await expect(inline).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(inline).not.toHaveCSS('padding', '0px')
  })
})
