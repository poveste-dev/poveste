import { expect, test } from '@playwright/test'

test.describe('story render', () => {
  test('renders the story content', async ({ page }) => {
    await page.goto('/story/app-components-simple-story-vue?variantId=_default')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    await expect(iframe.getByText('Simple story in Nuxt NuxtLink')).toBeVisible()
  })

  test('keeps the `nuxt-test` app empty inside the sandbox', async ({ page }) => {
    await page.goto('/story/app-components-simple-story-vue?variantId=_default')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    // Wait for the story before asserting the app root is empty: `toBeEmpty`
    // on an element the sandbox has not created yet reads as a failure rather
    // than as "not ready", which is how this lost under full-suite load.
    await expect(iframe.locator('.poveste-generic-render-story')).toBeVisible()
    await expect(iframe.locator('#nuxt-test[data-v-app]')).toBeEmpty()
  })

  test('renders auto-imported components', async ({ page }) => {
    await page.goto('/story/app-components-autoimport-story-vue?variantId=_default')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    await expect(iframe.getByText('Meow')).toBeVisible()
  })

  test('renders NuxtLink', async ({ page }) => {
    await page.goto('/story/app-components-basebuttonlink-story-vue?variantId=_default')
    await expect(page.locator('.poveste-generic-render-story a')).toContainText('Hello world')
  })

  test('renders the public config populated from Nuxt', async ({ page }) => {
    await page.goto('/story/app-components-autoimport-story-vue?variantId=_default')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    await expect(iframe.locator('.poveste-generic-render-story').getByTestId('config')).toContainText('test')
  })
})
