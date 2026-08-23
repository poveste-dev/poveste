import { expect, test } from '@playwright/test'

test.describe('stories list', () => {
  test('shows all stories with the expected variant counts', async ({ page }) => {
    await page.goto('/')
    await page.localStorage.clear()
    await page.reload()

    await expect(page.getByTestId('story-list-item')).toHaveCount(37)
    await expect(page.getByTestId('story-list-item').filter({ hasText: '🐱 Meow' })).toBeVisible()
    await expect(page.getByTestId('story-list-item').filter({ hasText: 'BaseButton' })).toContainText('3')
    await expect(page.getByTestId('story-list-item').filter({ hasText: 'Demo' })).toBeVisible()
    // 'Style Isolation' comes from the CSS isolation regression stories,
    // 'Conformance' from the shared contract set (#89).
    //
    // One folder per group, and this example's `tree.groups` route by a regex
    // on the title — `/Code gen|Controls|Docs/` picks out 'My Group'. So a
    // conformance story whose title matches lands in a different group from its
    // siblings and splits 'Conformance' into two half-full folders. That is the
    // config working as written, not a tree bug: `Conformance/Docs` is titled
    // Documentation for this reason, and the controls one 'Control bindings'.
    await expect(page.getByTestId('story-list-folder')).toHaveCount(4)
  })

  test('toggles folder visibility', async ({ page }) => {
    await page.goto('/')
    await page.localStorage.clear()
    await page.reload()

    // Filter on the title button instead of the folder element so nested
    // folder names don't leak into the parent's text content.
    const folderButton = (label: string) =>
      page.locator('[data-testid="story-list-folder"] [role="button"]').filter({ hasText: label })

    await folderButton('Sub Folder').click()
    await expect(page.getByTestId('story-list-item').filter({ hasText: 'Sub Story 2' })).toBeVisible()

    await folderButton('Meow').click()
    await expect(page.getByTestId('story-list-item').filter({ hasText: 'Sub Story 1' })).toBeVisible()

    await folderButton('Meow').click()
    await expect(page.getByTestId('story-list-item').filter({ hasText: 'Sub Story 1' })).toHaveCount(0)

    await folderButton('Sub Folder').click()
    await expect(page.getByTestId('story-list-item').filter({ hasText: 'Sub Story 2' })).toHaveCount(0)
  })
})
