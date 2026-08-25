import { expect, test } from '@playwright/test'

// @nuxtjs/i18n's client plugin cannot boot in the story sandbox; poveste drops
// it so the iframe no longer 500s, and the example installs vue-i18n into the
// story app in `poveste.setup.ts` so `$t`/`useI18n` still work (#65).
test.describe('nuxt i18n', () => {
  test('renders a translated story instead of a 500', async ({ page }) => {
    await page.goto('/story/app-components-i18n-story-vue?variantId=app-components-i18n-story-vue-0')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    await expect(iframe.getByText('Hello')).toBeVisible()
    // The upstream failure painted Nuxt's error page into the iframe.
    await expect(iframe.getByText('Internal Server Error')).toHaveCount(0)
  })

  test('switches locale from the controls', async ({ page }) => {
    await page.goto('/story/app-components-i18n-story-vue?variantId=app-components-i18n-story-vue-0')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    await expect(iframe.getByText('Hello')).toBeVisible()

    // HstSelect is a custom floating-vue dropdown, not a native <select>: click
    // the trigger (showing the current label), then the option in the popper.
    await page.locator('[data-testid="story-controls"]').getByText('English', { exact: true }).click()
    await page.getByText('Français', { exact: true }).click()
    await expect(iframe.getByText('Bonjour')).toBeVisible()
  })

  test('renders messages from an in-component <i18n> block', async ({ page }) => {
    // The upstream failure (2): an `<i18n>` custom block broke the build (#65).
    await page.goto('/story/app-components-i18n-story-vue?variantId=app-components-i18n-story-vue-2')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    await expect(iframe.getByText('From an in-component block')).toBeVisible()
  })
})
