import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// A builtin control written in a story's own content, where the `controls` slot
// is the usual place for one. Collection renders that content to find the
// story's variants. The Svelte collector had no controls to render there, so
// this story threw and a Svelte book did not build at all (#925). That the book
// carries the story is `story-list.spec.ts`'s to say; these hold that the
// control then works where it was written.
const STORY = 'conformance-control-in-default-slot'

test.describe('a builtin control in a story\'s default slot', () => {
  test('renders in the preview with the state it is bound to', async ({ page }) => {
    await openStory(page, STORY)
    const preview = page.getByTestId('preview-iframe').contentFrame()

    await expect(preview.locator('.conformance-default-slot-label')).toHaveText('start')
    await expect(preview.locator('.poveste-wrapper').filter({ hasText: 'Label' }).locator('input')).toHaveValue('start')
  })

  test('and writes back to that state', async ({ page }) => {
    await openStory(page, STORY)
    const preview = page.getByTestId('preview-iframe').contentFrame()

    await preview.locator('.poveste-wrapper').filter({ hasText: 'Label' }).locator('input').fill('edited')

    await expect(preview.locator('.conformance-default-slot-label')).toHaveText('edited')
  })
})
