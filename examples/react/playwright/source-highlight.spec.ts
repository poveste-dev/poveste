import { expect, test } from '@playwright/test'

// The source panel read every story with the HTML grammar, which left a `.story.tsx`
// file in one colour, the generic on `defineStory` included (#1521).
test('highlights the story file as TSX, its types included', async ({ page }) => {
  await page.goto('/story/src-toggle-story-tsx?variantId=src-toggle-story-tsx-0')
  const code = page.getByTestId('story-source-code')
  const token = (text: string) => code.locator('span').filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) }).first()
  const colour = (text: string) => token(text).evaluate(span => getComputedStyle(span).color)

  await expect(token('import')).toBeVisible({ timeout: 60_000 })
  await expect(token('string')).toBeVisible()

  expect(new Set([await colour('import'), await colour('string'), await code.evaluate(pre => getComputedStyle(pre).color)]).size).toBe(3)
})
