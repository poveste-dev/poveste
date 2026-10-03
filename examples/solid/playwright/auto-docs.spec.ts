import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/*
 * Auto-docs for a Solid story (#1110), read off the rendered docs tab of the built
 * book. The story names `AutoDocsButton` in its `component` field; its props come
 * from the type of the component's first parameter, its defaults from `mergeProps`,
 * one agreeing with its tag and one contradicting it.
 */
const STORY = '/story/auto-docs-button?tab=docs'

function component(page: Page) {
  return page.locator('[data-component="AutoDocsButton"]')
}

function row(page: Page, prop: string) {
  return component(page).locator(`[data-slot="props"] [data-prop="${prop}"]`)
}

test.describe('the docs of a Solid story\'s component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORY)
  })

  test('titles the section with the component, not the story file', async ({ page }) => {
    await expect(component(page).locator('[data-slot="component-name"]')).toHaveText('AutoDocsButton', { timeout: 60_000 })
  })

  test('lists the component\'s own props, without the attributes it inherits', async ({ page }) => {
    const props = component(page).locator('[data-slot="props"] [data-prop]')

    await expect(props).toHaveCount(4, { timeout: 60_000 })
    await expect(props.evaluateAll(rows => rows.map(r => r.getAttribute('data-prop')).sort())).resolves.toEqual(['label', 'level', 'size', 'variant'])
  })

  test('shows a prop\'s description, type and that it is required', async ({ page }) => {
    const label = row(page, 'label')

    await expect(label).toContainText('The text on the button.', { timeout: 60_000 })
    await expect(label).toContainText('string')
    await expect(label.locator('[data-slot="required"]')).toBeVisible()
  })

  // The tag on `level` says 3 and `mergeProps` says 2: the built book shows what runs, unmarked.
  test('shows the default `mergeProps` applies', async ({ page }) => {
    await expect(row(page, 'size')).toContainText('md', { timeout: 60_000 })
    await expect(row(page, 'level')).toContainText('2')
    await expect(row(page, 'level').locator('[data-slot="default-conflict"]')).toHaveCount(0)
  })

  test('marks a deprecated prop and hides an internal one', async ({ page }) => {
    await expect(row(page, 'variant').locator('[data-slot="deprecated"]')).toContainText('use `tone`', { timeout: 60_000 })
    await expect(row(page, 'secret')).toHaveCount(0)
  })

  test('lists the slots and the event', async ({ page }) => {
    await expect(component(page).locator('[data-slot="slots"] [data-slot-name="icon"]')).toContainText('Shown before the label.', { timeout: 60_000 })
    await expect(component(page).locator('[data-slot="slots"] [data-slot-name="children"]')).toBeVisible()
    await expect(component(page).locator('[data-slot="events"] [data-event="onPress"]')).toContainText('MouseEvent')
  })
})
