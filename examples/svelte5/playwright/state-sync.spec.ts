import { expect, test } from '@playwright/test'

test.describe('state sync', () => {
  // The Vue control now mounts and renders on Svelte 5 (see render-story.spec.ts),
  // but writing back does not: `Wrap.svelte` assigns `value = args[0]` from
  // inside the Vue render closure, and that assignment no longer reaches the
  // story's `bind:value`. Story -> control works; control -> story does not.
  // Tracked in #81.
  test.fixme('syncs disabled state between iframe story and controls', async ({ page }) => {
    await page.goto('/story/src-basebutton-story-svelte?variantId=_default')
    const iframe = page.frameLocator('iframe[data-test-id="preview-iframe"]')
    const controls = page.getByTestId('story-controls')

    await expect(iframe.locator('button')).not.toHaveClass(/disabled/)

    await controls.locator('[role="checkbox"]').click()
    await expect(controls.locator('pre')).toContainText('"disabled": true')
    await expect(iframe.locator('button')).toHaveClass(/disabled/)

    await iframe.locator('input[type="checkbox"]').click()
    await expect(controls.locator('pre')).toContainText('"disabled": false')
  })

  test.fixme('syncs text state between inline story and controls', async ({ page }) => {
    await page.goto('/story/src-noiframe-story-svelte?variantId=_default')
    const sandbox = page.getByTestId('sandbox-render')
    const controls = page.getByTestId('story-controls')

    await expect(sandbox.getByText('Some content', { exact: true })).toBeVisible()

    await controls.locator('input').fill('42')
    await expect(sandbox.getByText('42', { exact: true })).toBeVisible()

    await sandbox.locator('input').fill('Meow')
    await expect(controls.locator('input')).toHaveValue('Meow')
  })
})
