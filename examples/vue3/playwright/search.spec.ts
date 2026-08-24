import { expect, test } from '@playwright/test'

test.describe('search', () => {
  test('finds stories and variants by title', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('search-btn').click()

    const input = page.getByTestId('search-modal').locator('input')
    await input.fill('Demo')
    await expect(page.getByTestId('search-item').first()).toBeVisible()
    await expect.poll(async () => page.getByTestId('search-item').count()).toBeGreaterThan(3)

    await page.getByTestId('search-item').filter({ hasText: 'untitled' }).first().click()
    await expect(page.locator('.poveste-toolbar-title')).toContainText('untitled')

    await page.getByTestId('search-btn').click()
    await page.getByTestId('search-modal').locator('input').fill('variant 2')
    await expect(page.locator('[data-testid="search-item"][data-selected]')).toContainText('Variant 2')
    await page.getByTestId('search-modal').locator('input').press('Enter')
    await expect(page.locator('.poveste-toolbar-title')).toContainText('Variant 2')
  })

  test('navigates results with the keyboard', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('search-btn').click()

    const input = page.getByTestId('search-modal').locator('input')
    await input.fill('Demo')
    // Search is async, and arrowing through a list that is still populating
    // moves the selection to whatever now sits at that index. Wait for the item
    // this test walks to before walking, or the run is load-sensitive.
    await expect(page.getByTestId('search-item').filter({ hasText: 'Variant 2' }).first()).toBeVisible()
    await expect(page.locator('[data-testid="search-item"][data-selected]')).toContainText('Demo')
    await input.press('ArrowDown')
    await expect(page.locator('[data-testid="search-item"][data-selected]')).toContainText('untitled')
    await input.press('ArrowDown')
    await expect(page.locator('[data-testid="search-item"][data-selected]')).toContainText('Variant 2')
    await input.press('Enter')
    await expect(page.locator('.poveste-toolbar-title')).toContainText('Variant 2')
  })

  test('closes via backdrop click and Escape', async ({ page }) => {
    await page.goto('/')

    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('search-modal')).toBeVisible()
    await page.locator('body').click({ position: { x: 10, y: 10 } })
    await expect(page.getByTestId('search-modal')).toBeHidden()

    await page.getByTestId('search-btn').click()
    await page.getByTestId('search-modal').locator('input').press('Escape')
    await expect(page.getByTestId('search-modal')).toBeHidden()
  })

  test('does not navigate on Enter once it has been closed', async ({ page }) => {
    await page.goto('/')

    // Open, get a real selection, then close — the modal hides with `v-show`,
    // so its Enter handler stays live afterwards (#114).
    await page.getByTestId('search-btn').click()
    await page.getByTestId('search-modal').locator('input').fill('Variant 2')
    await expect(page.locator('[data-testid="search-item"][data-selected]')).toContainText('Variant 2')
    await page.getByTestId('search-modal').locator('input').press('Escape')
    await expect(page.getByTestId('search-modal')).toBeHidden()

    const urlWhileClosed = page.url()
    // A window `keydown`, which is what the issue means by "any keystroke that
    // reaches the window": the handler has no focus requirement, so this is the
    // real surface — and Playwright's own `.press()` does not drive this
    // window-level shortcut path the way a genuine keystroke does.
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    await page.waitForTimeout(300)

    await expect(page.getByTestId('search-modal')).toBeHidden()
    expect(page.url()).toBe(urlWhileClosed)
  })

  test('finds matches inside docs content', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('search-btn').click()
    await page.getByTestId('search-modal').locator('input').fill('welcome')
    await expect(page.getByTestId('search-item').first()).toBeVisible()
    await expect.poll(async () => page.getByTestId('search-item').count()).toBeGreaterThan(3)
    await expect(page.getByTestId('search-item').filter({ hasText: 'Introduction' })).toBeVisible()
  })
})
