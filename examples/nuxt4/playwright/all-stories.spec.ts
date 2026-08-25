import { expect, test } from '@playwright/test'

// This example mirrors the vue3 story set so a chrome feature exercised on Vue is
// exercised under the Nuxt plugin too. It is one short of vue3's count: vue3
// carries a plain vue-i18n demo, whereas Nuxt demonstrates i18n through its own
// `Nuxt/i18n` story instead (#65). The five Nuxt-only stories sit under a `Nuxt/`
// title, so they fold into one folder rather than adding five entries here.
test.describe('stories list', () => {
  test('shows all stories', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    await page.localStorage.clear()
    await page.reload()

    await expect(page.getByTestId('story-list-item')).toHaveCount(37)
    // The Nuxt-specific set, kept out of the shared names so a collision with
    // vue3's `BaseButton` cannot split a folder in two.
    await expect(page.locator('[data-testid="story-list-folder"] [role="button"]').filter({ hasText: 'Nuxt' })).toBeVisible()
  })
})
