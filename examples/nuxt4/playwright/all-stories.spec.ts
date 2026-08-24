import { expect, test } from '@playwright/test'

// The same count vue3's `stories-list.spec.ts` asserts, because this example now
// carries the same stories: the point of mirroring them is that a chrome feature
// exercised on Vue is exercised under the Nuxt plugin too. The four Nuxt-only
// stories sit under a `Nuxt/` title, so they fold into one folder rather than
// adding four entries here.
test.describe('stories list', () => {
  test('shows all stories', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    await page.localStorage.clear()
    await page.reload()

    await expect(page.getByTestId('story-list-item')).toHaveCount(38)
    // The Nuxt-specific set, kept out of the shared names so a collision with
    // vue3's `BaseButton` cannot split a folder in two.
    await expect(page.locator('[data-testid="story-list-folder"] [role="button"]').filter({ hasText: 'Nuxt' })).toBeVisible()
  })
})
