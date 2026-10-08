import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { openStory, recordSandboxReady, waitForSandboxReady } from '../../../e2e/support'

/*
 * The React book is a fixture rather than a conformance book: the shared suite
 * asserts controls, and React stories have none yet (#371, #1114, #1110). What it
 * proves instead is the renderer — that a story renders, inside its wrapper, that
 * state moves both ways, and that a hook in `render` keeps its state when it does.
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

test.describe('a React book', () => {
  test('renders a story inside the wrapper its setup file adds', async ({ page }) => {
    await open(page, 'src-badge-story-tsx', 'info')

    await expect(preview(page).locator('[data-testid="story-frame"] .badge-info')).toHaveText('Information')
    await expect(page.locator('[data-testid="story-error"]')).toHaveCount(0)
  })

  test('says why a variant without state has no controls, and still shows the panel toolbar', async ({ page }) => {
    await open(page, 'src-badge-story-tsx', 'info')

    await expect(page.getByTestId('story-controls')).toContainText('React stories have no controls yet')
    // The toolbar waits on the controls slot reporting ready.
    await expect(page.getByTestId('story-controls').locator('.poveste-state-presets')).toBeVisible()
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

  test('carries an edit in the panel to the story', async ({ page }) => {
    await open(page, 'src-counter-story-tsx', 'default')

    await countField(page).fill('42')

    await expect(preview(page).getByTestId('count')).toHaveText('42')
  })

  // `render` is a component body: a hook in it is legal, and its state survives
  // the re-render a change from the panel causes.
  test('keeps a hook\'s state in render when the panel changes the story', async ({ page }) => {
    await open(page, 'src-toggle-story-tsx', '_default')
    const toggle = preview(page).getByRole('button')
    await toggle.click()
    await expect(toggle).toHaveText('Power: On')

    await page.getByTestId('story-controls').getByLabel('label', { exact: true }).fill('Light')

    await expect(toggle).toHaveText('Light: On')
  })
})
