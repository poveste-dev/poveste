import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// Shared because the plugins reach it differently (#233) and the panel must not
// be able to tell.
const STORY = 'conformance-auto-props'

function cell(page: Page, title: string) {
  return page.locator('.poveste-story-variant-grid-item').filter({ hasText: title })
}

function rendered(page: Page, title: string) {
  return cell(page, title).frameLocator('iframe').locator('body')
}

// Scoped to the group: Vue also exposes a component's data as state, so an
// unscoped search for a prop name finds that too.
function control(page: Page, component: string, prop: string) {
  return page.locator('.poveste-controls-component-props')
    .filter({ hasText: `<${component}>` })
    .locator('.poveste-controls-component-prop-item')
    .filter({ hasText: prop })
}

test.describe('auto-props', () => {
  test('offers a control for a prop the story never binds', async ({ page }) => {
    await openStory(page, STORY, '?variantId=naked')

    await expect(rendered(page, 'Naked')).toContainText('Hello world!')
    await expect(control(page, 'AutoStateProps', 'name')).toBeVisible()

    // A text field, not the JSON editor a prop of unknown type falls back to.
    // Vue erases the types it infers from a type-only `defineProps` in a
    // production build, so this only ever failed in the built book (#490).
    // Bounded: `poveste-textarea` contains the same substring.
    await expect(control(page, 'AutoStateProps', 'name')).toHaveClass(/(^|\s)poveste-text(\s|$)/)
  })

  test('drives the component from that control', async ({ page }) => {
    await openStory(page, STORY, '?variantId=naked')
    await expect(rendered(page, 'Naked')).toContainText('Hello world!')

    await control(page, 'AutoStateProps', 'name').locator('input').fill('Bender')

    await expect(rendered(page, 'Naked')).toContainText('Hello Bender!')
  })

  // Both halves pin where the spread sits: untouched loses, touched wins.
  test('leaves a prop the story binds itself alone until the control is touched', async ({ page }) => {
    await openStory(page, STORY, '?variantId=state')

    await expect(rendered(page, 'State')).toContainText('Hello Fry!')

    await control(page, 'AutoStateProps', 'name').locator('input').fill('Leela')

    await expect(rendered(page, 'State')).toContainText('Hello Leela!')
  })

  // `_hPropState` is keyed by a component's index within one variant, so it
  // cannot mean anything in another. Vue used to carry it to every variant
  // through the story's implicit state (#473).
  test('drives only the variant whose control was used', async ({ page }) => {
    await openStory(page, STORY, '?variantId=naked')
    await expect(rendered(page, 'Naked')).toContainText('Hello world!')
    await expect(rendered(page, 'State')).toContainText('Hello Fry!')

    await control(page, 'AutoStateProps', 'name').locator('input').fill('Bender')

    await expect(rendered(page, 'Naked')).toContainText('Hello Bender!')
    await expect(rendered(page, 'State')).toContainText('Hello Fry!')
  })
})
