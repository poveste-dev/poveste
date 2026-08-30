import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

/*
 * Auto-props: the controls panel builds itself from the props a component
 * declares, with nothing written in the story.
 *
 * This was Vue-only for as long as it existed, because Vue's implementation
 * reads the vnodes a variant is about to render and writes control values back
 * into that same tree. Svelte renders straight to the DOM and has no such step,
 * so the plugin does it to the source instead (#233) — which is exactly why this
 * belongs in the shared suite rather than a Vue one. Two different mechanisms
 * are only worth having if they are indistinguishable from the panel.
 *
 * The "Naked" variant is the whole claim: `<AutoStateProps />`, no binding, no
 * `initState`. A control appears for `name` and it drives the component.
 *
 * Isolation between variants is deliberately not asserted here. The two plugins
 * differ: editing Naked's control leaves the sibling alone under Svelte and
 * changes it under Vue, where a variant with no `initState` shares the story's
 * implicit state. That is worth knowing and is not what this spec is for.
 */
const STORY = 'conformance-auto-props'

function cell(page: Page, title: string) {
  return page.locator('.poveste-story-variant-grid-item').filter({ hasText: title })
}

function rendered(page: Page, title: string) {
  return cell(page, title).frameLocator('iframe').locator('body')
}

// Scoped to the auto-props group. Vue also exposes a component's data as state,
// so an unscoped search for a prop name finds that too — a real difference
// between the plugins, and not the one this spec is about.
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
  })

  test('drives the component from that control', async ({ page }) => {
    await openStory(page, STORY, '?variantId=naked')
    await expect(rendered(page, 'Naked')).toContainText('Hello world!')

    await control(page, 'AutoStateProps', 'name').locator('input').fill('Bender')

    await expect(rendered(page, 'Naked')).toContainText('Hello Bender!')
  })

  // Last spread wins in Svelte, and Vue writes into the vnode the same way — so
  // in both, a prop the story binds keeps its value until that control is used.
  test('leaves a prop the story binds itself alone until the control is touched', async ({ page }) => {
    await openStory(page, STORY, '?variantId=state')

    await expect(rendered(page, 'State')).toContainText('Hello Fry!')
    await expect(control(page, 'AutoStateProps', 'name')).toBeVisible()
  })
})
