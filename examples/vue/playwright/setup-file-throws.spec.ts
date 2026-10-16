import { expect, test } from '@playwright/test'

/*
 * A setup file that throws when the browser loads it, the way one importing a Node
 * built-in does once Vite has replaced the built-in with an empty module. The
 * framework's client imports the setup file, so every preview failed to load, and
 * in a built book each stayed blank with the error in the console alone (#1323).
 * The setup file is made to throw for this page only, so no other spec is broken.
 */
test('a setup file that throws in the browser is reported on the story, not left blank', async ({ page }) => {
  // The module keeps its exports, which the browser links before running it.
  await page.route(/\/poveste\.setup[^/]*$/, async (route) => {
    const response = await route.fetch()
    await route.fulfill({ response, body: `throw new Error("the setup file threw");\n${await response.text()}` })
  })

  await page.goto('/story/conformance-contrast')

  await expect(page.getByTestId('story-error-message')).toContainText('the setup file threw')
  await expect(page.getByTestId('story-error-message')).toContainText('imports the setup file')
})
