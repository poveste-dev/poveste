import { expect, test } from '@playwright/test'

// "Remove override" used to render in the control's actions slot, inside the
// control's `<label>`. A label forwards a click on its content to the first
// labelable element it holds, and the JSON control holds no input, so a
// `<button>` there was that element: clicking back into the editor removed the
// override just made (#827).
//
// Here rather than in the conformance set: this book's ComplexParameter is the
// only story with a prop whose control is the JSON editor.
test('clicking into a JSON prop control keeps its override', async ({ page }) => {
  await page.goto('/story/src-components-complexparameter-story-vue')
  const control = page.locator('.poveste-controls-component-prop-item.poveste-json').filter({ hasText: 'recursiveParameter' })
  const remove = page.getByRole('button', { name: 'Remove override of recursiveParameter', exact: true })
  await expect(remove).toBeDisabled()

  const editor = control.locator('.cm-content')
  await editor.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('{"name":"edited"}')
  await expect(remove).toBeEnabled()

  await editor.click()
  await control.getByText(/^recursiveParameter/).click()

  await expect(remove).toBeEnabled()
})
