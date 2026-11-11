import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// A prop's control comes from its type when the component is documented (#160).
const STORY = 'conformance-typed-controls'

// By position: the same-name variant renders two components the panel names alike.
function control(page: Page, prop: string, component = 0) {
  return page.locator('.poveste-controls-component-props')
    .nth(component)
    .locator('[data-control]')
    .filter({ has: page.locator('[data-slot="title"]', { hasText: new RegExp(`^${prop}( \\*)?$`) }) })
}

test.describe('controls from types', () => {
  test('gives a literal union behind an alias a select of its values', async ({ page }) => {
    await openStory(page, STORY, '?variantId=typed')

    await expect(control(page, 'size')).toHaveAttribute('data-control', 'select', { timeout: 20_000 })
    await control(page, 'size').locator('[data-slot="trigger"]').click()
    await expect(page.locator('.poveste-select-popper [role="option"]')).toHaveText(['sm', 'md', 'lg'])
  })

  test('follows the story\'s override, and hides what it hides', async ({ page }) => {
    await openStory(page, STORY, '?variantId=overridden')

    await expect(control(page, 'level')).toHaveAttribute('data-control', 'slider')
    await expect(control(page, 'tone')).toHaveAttribute('data-control', 'text')
    await expect(control(page, 'size')).toHaveAttribute('data-control', 'select', { timeout: 20_000 })
    await expect(control(page, 'secret')).toHaveCount(0)
  })

  // Two components of one name: a join by name alone gave the second the first's select.
  test('never gives a component the types of another of its name', async ({ page }) => {
    await openStory(page, `${STORY}-same-name`, '?variantId=same-name')
    await expect(control(page, 'size', 1)).toHaveAttribute('data-control', 'number')
    // Long enough for the docs to arrive and be applied wherever they were going to be.
    await page.waitForTimeout(3_000)

    await expect(control(page, 'size', 1)).not.toHaveAttribute('data-control', 'select')
  })
})

test.describe('a control whose type arrives while the reader is in it', () => {
  // Built books only, as every spec here: each component's docs load as a chunk of its own,
  // which can be held back until the reader is typing.
  test('keeps its kind until the reader leaves it and lets go of their value', async ({ page }) => {
    let release!: () => void
    const held = new Promise<void>(resolve => release = resolve)
    await page.route(/virtual_component-docs-data_\d+-/, async (route) => {
      await held
      await route.continue()
    })
    await openStory(page, STORY, '?variantId=typed')
    const field = control(page, 'size').locator('input')
    await field.fill('xl')

    release()
    await page.waitForTimeout(2_000)

    await expect(control(page, 'size')).toHaveAttribute('data-control', 'text')
    await field.blur()
    await expect(control(page, 'size')).toHaveAttribute('data-control', 'text')
    await page.getByRole('button', { name: 'Remove override of size' }).click()
    await expect(control(page, 'size')).toHaveAttribute('data-control', 'select')
  })
})
