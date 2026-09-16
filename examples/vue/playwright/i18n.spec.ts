import { expect, test } from '@playwright/test'

// Plain Vue + vue-i18n, installed in `poveste.setup.ts` — no sandbox seam, unlike
// the Nuxt example (#65). This proves `useI18n`/`$t` work in a story.
test.describe('vue i18n', () => {
  async function pickLocale(page: import('@playwright/test').Page, current: string, next: string) {
    await page.locator('[data-testid="story-controls"]').getByText(current, { exact: true }).click()
    await page.locator('.v-popper__popper').getByText(next, { exact: true }).click()
  }

  test('renders and switches a translation', async ({ page }) => {
    await page.goto('/story/src-components-i18n-story-vue?variantId=src-components-i18n-story-vue-0')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    await expect(iframe.getByText('Hello')).toBeVisible()

    await pickLocale(page, 'English', 'Français')
    await expect(iframe.getByText('Bonjour')).toBeVisible()
  })

  test('interpolates the plural count', async ({ page }) => {
    await page.goto('/story/src-components-i18n-story-vue?variantId=src-components-i18n-story-vue-1')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    const count = page.locator('[data-testid="story-controls"] label.poveste-wrapper')
      .filter({ hasText: /Count/ })
      .locator('input[type="number"]')

    await expect(iframe.getByText('2 items')).toBeVisible()
    await count.fill('1')
    await expect(iframe.getByText('one item')).toBeVisible()
    await count.fill('0')
    await expect(iframe.getByText('no items')).toBeVisible()
  })
})
