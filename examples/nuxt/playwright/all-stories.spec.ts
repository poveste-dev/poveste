import { expect, test } from '@playwright/test'

// This example mirrors the vue story set so a chrome feature exercised on Vue is
// exercised under the Nuxt plugin too. It is one short of vue's count: vue
// carries a plain vue-i18n demo, whereas Nuxt demonstrates i18n through its own
// `Nuxt/i18n` story instead (#65). The five Nuxt-only stories sit under a `Nuxt/`
// title, so they fold into one folder rather than adding five entries here.
test.describe('stories list', () => {
  test('shows all stories', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    await page.localStorage.clear()
    await page.reload()

    // Moves when the conformance set gains a story, the same as vue's count;
    // `/add-conformance-story` names both files.
    await expect(page.getByTestId('story-list-item'), 'the sidebar lists a different number of stories — a story added to the conformance set moves this count').toHaveCount(38)
    // The Nuxt-specific set, kept out of the shared names so a collision with
    // vue's `BaseButton` cannot split a folder in two.
    await expect(page.locator('[data-testid="story-list-folder"] [role="button"]').filter({ hasText: 'Nuxt' })).toBeVisible()
  })
})
