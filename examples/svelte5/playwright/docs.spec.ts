import { expect, test } from '@playwright/test'

/*
 * The markdown pipeline and the app stylesheet are shared with vue3, which
 * covers the same styling in `docs.spec.ts` there. What is not shared is the
 * route: vue3 renders a standalone `.md` story, while a `.story.md` sitting
 * next to a component renders in the docs *panel* alongside the story. Both
 * broke together in the Tailwind v4 upgrade; only one of them was noticed.
 */
test.describe('story docs panel', () => {
  const DOCS = '/story/src-basebutton-story-svelte?variantId=_default&tab=docs'

  test('renders the markdown attached to a story', async ({ page }) => {
    await page.goto(DOCS)

    const docs = page.getByTestId('story-docs')
    await expect(docs.locator('h1')).toContainText('BaseButton')
    await expect(docs).toContainText('Hello world!')
  })

  test('keeps prose styling out of markdown code blocks', async ({ page }) => {
    await page.goto(DOCS)

    const block = page.locator('.__poveste-code').first()
    await expect(block).toHaveCSS('position', 'relative')
    await expect(block.locator('> div').first()).toHaveCSS('position', 'absolute')

    // Neither shiki's `code` nor the `code` markdown-it wraps around it may
    // pick up the inline-code pill.
    for (const code of [block.locator('pre code'), page.locator('pre > code.language-svelte').first()]) {
      await expect(code).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await expect(code).toHaveCSS('padding', '0px')
    }

    // Inline code keeps the pill it is supposed to have.
    const inline = page.locator('.prose p code').first()
    await expect(inline).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(inline).not.toHaveCSS('padding', '0px')
  })
})
