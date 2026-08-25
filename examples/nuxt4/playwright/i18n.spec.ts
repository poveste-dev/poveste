import { expect, test } from '@playwright/test'

// @nuxtjs/i18n's client plugin cannot boot in the story sandbox; poveste drops
// it so the iframe no longer 500s, and the example installs vue-i18n into the
// story app in `poveste.setup.ts` so `$t`/`useI18n` still work (#65).
test.describe('nuxt i18n', () => {
  // HstSelect is a custom floating-vue dropdown, not a native <select>: click the
  // trigger (showing the current label), then the option in the teleported popper.
  async function pickLocale(page: import('@playwright/test').Page, current: string, next: string) {
    await page.locator('[data-testid="story-controls"]').getByText(current, { exact: true }).click()
    await page.locator('.v-popper__popper').getByText(next, { exact: true }).click()
  }

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

    await pickLocale(page, 'English', 'Français')
    await expect(iframe.getByText('Bonjour')).toBeVisible()
  })

  test('interpolates the plural count in each locale', async ({ page }) => {
    // The pluralization variant renders `t('items', count)`, so `{count}` has to
    // be filled and the right plural form picked, across the count and locale.
    await page.goto('/story/app-components-i18n-story-vue?variantId=app-components-i18n-story-vue-1')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    // `Count` (capital) is the HstNumber; a lower-case `count` prop control may
    // sit beside it, so the regex is case-sensitive.
    const count = page.locator('[data-testid="story-controls"] label.poveste-wrapper')
      .filter({ hasText: /Count/ })
      .locator('input[type="number"]')

    // All three English plural forms.
    await expect(iframe.getByText('2 items')).toBeVisible()
    await count.fill('1')
    await expect(iframe.getByText('one item')).toBeVisible()
    await count.fill('0')
    await expect(iframe.getByText('no items')).toBeVisible()

    // The same key in the other locale still interpolates `{count}`.
    await count.fill('2')
    await pickLocale(page, 'English', 'Français')
    await expect(iframe.getByText('2 articles')).toBeVisible()
  })

  test('renders and switches messages from an in-component <i18n> block', async ({ page }) => {
    // The upstream failure (2): an `<i18n>` custom block broke the build (#65).
    // The block carries its own local-scope messages, switched independently.
    await page.goto('/story/app-components-i18n-story-vue?variantId=app-components-i18n-story-vue-2')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    await expect(iframe.getByText('From an in-component block')).toBeVisible()

    await pickLocale(page, 'English', 'Français')
    await expect(iframe.getByText('Depuis un bloc dans le composant')).toBeVisible()
  })

  test('compiles a YAML <i18n> block', async ({ page }) => {
    // Same block feature, `lang="yaml"` — handled by the same block compiler.
    await page.goto('/story/app-components-i18n-story-vue?variantId=app-components-i18n-story-vue-3')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    await expect(iframe.getByText('From a YAML block')).toBeVisible()

    await pickLocale(page, 'English', 'Français')
    await expect(iframe.getByText('Depuis un bloc YAML')).toBeVisible()
  })
})
