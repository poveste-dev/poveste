import { expect, test } from '@playwright/test'

// Svelte i18n needs no sandbox shim the way Nuxt's @nuxtjs/i18n does (#65): a
// plain module renders straight into a story, so this just proves it works.
test.describe('svelte i18n', () => {
  const STORY = 'src-i18n-story-svelte'

  test('renders module translations in a locale grid', async ({ page }) => {
    await page.goto(`/story/${STORY}`)

    // CSS isolation gives each grid cell its own sandbox iframe; select the cell
    // by the variant its `src` names, so this doesn't depend on cell ordering.
    const cell = (variant: number) =>
      page.locator(`iframe[data-testid="preview-iframe"][src*="variantId=${STORY}-${variant}"]`).contentFrame()

    await expect(cell(0).getByText('Hello')).toBeVisible()
    await expect(cell(1).getByText('Bonjour')).toBeVisible()
  })
})
