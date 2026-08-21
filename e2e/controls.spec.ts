import { expect, test } from '@playwright/test'

// The controls panel is `@poveste/app` plus `@poveste/controls`, shared by every
// framework — but what reaches a control is the framework's own state binding,
// and that is where the two differ: Vue's `v-model` against Svelte 5's
// `bind:value`, which passes a getter/setter pair rather than a value. A control
// that silently stops writing back under one plugin is exactly the regression
// this suite exists to catch, and it had no cross-framework coverage.
const STORY = '/story/conformance-controls'
const STATE = '.conformance-controls-state'

test.describe('controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORY)
  })

  test('writes text back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"label": "Hello"')
    await controls.locator('.poveste-wrapper').filter({ hasText: 'Label' }).locator('input').fill('Foo')
    await expect(state).toContainText('"label": "Foo"')
  })

  test('writes a checkbox back to the state, both ways', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"enabled": false')
    await controls.getByText('Enabled').click()
    await expect(state).toContainText('"enabled": true')
    // Back again: a control that only ever writes `true` passes a one-way check.
    await controls.getByText('Enabled').click()
    await expect(state).toContainText('"enabled": false')
  })

  test('writes a number back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"count": 20')
    await controls.locator('input[type="number"]').fill('42')
    // Unquoted: a control that writes the string "42" still renders as 42 on
    // screen, and this is the assertion that tells them apart.
    await expect(state).toContainText('"count": 42')
  })

  test('writes a textarea back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"notes": "Longer text..."')
    await controls.locator('textarea').fill('Meow meow meow')
    await expect(state).toContainText('"notes": "Meow meow meow"')
  })

  test('writes a select back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"game": "crash-bandicoot"')

    // Not a native `<select>` — it is a floating-vue dropdown of divs, so the
    // option is picked by clicking its label in the popper.
    await controls.locator('.poveste-wrapper').filter({ hasText: 'Game' }).click()
    await page.locator('.v-popper__popper').getByText('The Last of Us').click()

    await expect(state).toContainText('"game": "the-last-of-us"')
  })

  test('writes a colour back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"tint": "#000000"')
    await controls.locator('.poveste-wrapper').filter({ hasText: 'Tint' }).locator('input[type="text"]').fill('#ffffff')
    await expect(state).toContainText('"tint": "#ffffff"')
  })
})
