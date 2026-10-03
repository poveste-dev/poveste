import { expect, test } from '@playwright/test'

/*
 * Auto-docs, read off the rendered docs tab (#1159). `AutoDocsButton`'s props are
 * an interface extending another from a separate file, with defaults from
 * `withDefaults` that agree with one tag and contradict another.
 *
 * Runs against the built book, where `poveste build` extracted the docs, and
 * against `poveste dev`, where opening the tab is what starts extraction.
 */
const STORY = '/story/auto-docs-button?tab=docs'

test.describe('the docs of a story\'s component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORY)
  })

  function row(page: import('@playwright/test').Page, prop: string) {
    return page.locator('[data-component="AutoDocsButton"] [data-slot="props"]').locator(`[data-prop="${prop}"]`)
  }

  test('lists props from the interface and the one it extends', async ({ page }) => {
    const props = page.locator('[data-component="AutoDocsButton"] [data-slot="props"] [data-prop]')

    await expect(props).toHaveCount(4, { timeout: 60_000 })
    await expect(props.evaluateAll(rows => rows.map(r => r.getAttribute('data-prop')).sort())).resolves.toEqual(['label', 'level', 'size', 'variant'])
  })

  test('shows a prop\'s description, type and that it is required', async ({ page }) => {
    const label = row(page, 'label')

    await expect(label).toContainText('The text on the button.', { timeout: 60_000 })
    await expect(label).toContainText('string')
    await expect(label.locator('[data-slot="required"]')).toBeVisible()
  })

  test('shows the code\'s default', async ({ page }) => {
    await expect(row(page, 'size')).toContainText('md', { timeout: 60_000 })
    await expect(row(page, 'level')).toContainText('2')
  })

  // The tag says 3, the code says 2: dev marks it, the built book only shows what runs.
  test('marks a default the tag contradicts, in dev only', async ({ page }, testInfo) => {
    const conflict = row(page, 'level').locator('[data-slot="default-conflict"]')
    await expect(row(page, 'level')).toBeVisible({ timeout: 60_000 })

    if (testInfo.project.name.endsWith(':dev')) {
      await expect(conflict).toHaveAttribute('title', /says 3/)
    }
    else {
      await expect(conflict).toHaveCount(0)
    }
    await expect(row(page, 'size').locator('[data-slot="default-conflict"]')).toHaveCount(0)
  })

  test('marks a deprecated prop and hides an internal one', async ({ page }) => {
    await expect(row(page, 'variant').locator('[data-slot="deprecated"]')).toContainText('use `tone`', { timeout: 60_000 })
    await expect(row(page, 'secret')).toHaveCount(0)
  })

  test('lists the slot and the event', async ({ page }) => {
    const component = page.locator('[data-component="AutoDocsButton"]')

    await expect(component.locator('[data-slot="slots"] [data-slot-name="icon"]')).toContainText('Shown before the label.', { timeout: 60_000 })
    await expect(component.locator('[data-slot="events"] [data-event="press"]')).toContainText('MouseEvent')
  })
})
