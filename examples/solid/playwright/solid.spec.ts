import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory, recordSandboxReady, waitForSandboxReady } from '../../../e2e/support'

/*
 * The Solid book is a fixture rather than a conformance book: the shared suite
 * asserts controls, and Solid stories have none yet (#61, #1114, #1110). What it
 * proves instead is the renderer — that a story renders, inside its wrapper, and
 * that state moves both ways without the component running again.
 */

function preview(page: Page) {
  return page.getByTestId('preview-iframe').contentFrame()
}

/** The state panel's field for `count`, found by its key rather than its position. */
function countField(page: Page) {
  return page.getByTestId('story-controls').getByLabel('count', { exact: true })
}

async function open(page: Page, storyId: string, variantId: string) {
  await recordSandboxReady(page)
  await openStory(page, storyId, `?variantId=${variantId}`)
  await waitForSandboxReady(page, variantId)
}

test.describe('a Solid book', () => {
  test('renders a story inside the wrapper its setup file adds', async ({ page }) => {
    await open(page, 'src-badge-story-tsx', 'info')

    await expect(preview(page).locator('[data-testid="story-frame"] .badge-info')).toHaveText('Information')
    await expect(page.locator('[data-testid="story-error"]')).toHaveCount(0)
  })

  test('says why a variant without state has no controls, and still shows the panel toolbar', async ({ page }) => {
    await open(page, 'src-badge-story-tsx', 'info')

    await expect(page.getByTestId('story-controls')).toContainText('Solid stories have no controls yet')
    // The toolbar waits on the controls slot reporting ready, which the
    // explanation used not to do.
    await expect(page.getByTestId('story-controls').locator('.poveste-state-presets')).toBeVisible()
  })

  test('collects and renders a story built with solid-js/html', async ({ page }) => {
    await open(page, 'src-taggedtemplate-story-tsx', 'default')

    await expect(preview(page).getByTestId('tagged')).toHaveText('Rendered by solid-js/html')
  })

  test('shows the story file as its source', async ({ page }) => {
    await open(page, 'src-badge-story-tsx', 'info')

    await expect(page.locator('.poveste-story-source-code')).toContainText('defineStory')
  })

  test('starts a variant from its own initState rather than the story\'s', async ({ page }) => {
    await open(page, 'src-counter-story-tsx', 'ten')

    await expect(preview(page).getByTestId('count')).toHaveText('10')
  })

  test('carries a click in the story to the state panel', async ({ page }) => {
    await open(page, 'src-counter-story-tsx', 'ten')

    await preview(page).locator('button.counter').click()
    await preview(page).locator('button.counter').click()

    await expect(preview(page).getByTestId('count')).toHaveText('12')
    await expect(countField(page)).toHaveValue('12')
  })

  // A Solid component runs once. If an edit reached the story by rendering it
  // again, the button would be a new node; through the store it is the same one.
  test('carries an edit in the panel to the story without rendering it again', async ({ page }) => {
    await open(page, 'src-counter-story-tsx', 'default')
    const button = preview(page).locator('button.counter')
    await button.evaluate((node) => {
      Reflect.set(node, '__marked', true)
    })

    await countField(page).fill('42')

    await expect(preview(page).getByTestId('count')).toHaveText('42')
    expect(await button.evaluate(node => Reflect.get(node, '__marked'))).toBe(true)
  })
})
