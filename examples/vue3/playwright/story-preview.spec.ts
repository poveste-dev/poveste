import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// The count assertion is the wait: the list has to be there before a variant
// can be picked out of it by name.
async function openDemoVariant(page: Page, name: string) {
  await page.goto('/')
  await page.getByTestId('story-list-item').filter({ hasText: 'Demo' }).click()
  await expect(page.getByTestId('story-variant-list-item')).toHaveCount(2)
  await page.getByTestId('story-variant-list-item').filter({ hasText: name }).click()
  await expect(page.locator('.poveste-toolbar-title')).toContainText(name)
}

test.describe('story preview', () => {
  test('renders the untitled (first) variant', async ({ page }) => {
    await openDemoVariant(page, 'untitled')

    const iframe = page.frameLocator('iframe[data-test-id="preview-iframe"]')
    await expect(iframe.getByText('Hello world!')).toBeVisible()
    // Polled, not read once: the story renders before the pane is highlighted.
    await expect.poll(() => page.getByTestId('story-source-code').textContent())
      .toEqual('<Demo message="Hello world!" />')
  })

  test('renders the second variant', async ({ page }) => {
    await openDemoVariant(page, 'Variant 2')

    const iframe = page.frameLocator('iframe[data-test-id="preview-iframe"]')
    await expect(iframe.getByText('Meow!')).toBeVisible()
    await expect.poll(() => page.getByTestId('story-source-code').textContent())
      .toEqual('<Demo message="Meow!" />')
  })
})
