import { expect, test } from '@playwright/test'

// A setup hook ran after the story mounted, so it could arrange nothing for it, and
// `getContext` in a component read `undefined` (#234).
test('a component reads what the setup hooks put in its context', async ({ page }) => {
  await page.goto('/story/setup-context')

  const frame = page.getByTestId('preview-iframe').contentFrame()
  await expect(frame.locator('.setup-context-file')).toHaveText('set by the setup file')
  await expect(frame.locator('.setup-context-story')).toHaveText('set by setupApp')
})
