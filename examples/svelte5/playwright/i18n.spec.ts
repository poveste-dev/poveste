import { expect, test } from '@playwright/test'

// Svelte i18n needs no sandbox shim the way Nuxt's @nuxtjs/i18n does (#65): a
// plain module renders straight into a story, so this just proves it works.
test.describe('svelte i18n', () => {
  test('renders module translations in a locale grid', async ({ page }) => {
    await page.goto('/story/src-i18n-story-svelte')
    // CSS isolation gives each grid cell its own sandbox iframe.
    const gridFrame = (i: number) => page.getByTestId('preview-iframe').nth(i).contentFrame()
    await expect(gridFrame(0).getByText('Hello')).toBeVisible()
    await expect(gridFrame(1).getByText('Bonjour')).toBeVisible()
  })
})
