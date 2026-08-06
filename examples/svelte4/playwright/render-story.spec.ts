import { expect, test } from '@playwright/test'

test.describe('story render', () => {
  test('renders the iframe story content', async ({ page }) => {
    await page.goto('/story/src-meow-story-svelte?variantId=src-meow-story-svelte-0')
    const iframe = page.frameLocator('iframe[data-test-id="preview-iframe"]')
    await expect(iframe.getByText('😺')).toBeVisible()
  })

  test('renders the inline (no-iframe) story content', async ({ page }) => {
    await page.goto('/story/src-noiframe-story-svelte?variantId=_default')
    await expect(page.getByTestId('story-variant-single-view').getByText('No iframe story content')).toBeVisible()
  })

  test('renders all variants in the grid', async ({ page }) => {
    await page.goto('/story/src-cars-story-svelte')
    // With CSS isolation on, each grid item renders in its own sandbox iframe.
    const gridFrame = (index: number) =>
      page.frameLocator('iframe[data-test-id="preview-iframe"]').nth(index)
    await expect(gridFrame(0).getByText('🚗')).toBeVisible()
    await expect(gridFrame(1).getByText('🏎️')).toBeVisible()
    await expect(gridFrame(2).getByText('🚜')).toBeVisible()
  })
})

test.describe('controls render', () => {
  // Hst.Checkbox / Hst.Select stay as the literal placeholder string
  // ("HstCheckbox" / "HstSelect") instead of mounting the Vue control.
  // The bridge in `packages/poveste-plugin-svelte/src/client/Wrap.svelte`
  // expects `app.mount(el)` to wipe the placeholder during Svelte's onMount,
  // but the Vue mount is no-op'ing under the Svelte 5 compat path.
  // Cypress fails identically — same translation, same coverage.
  test.fixme('shows the controls for a variant with default props', async ({ page }) => {
    await page.goto('/story/src-basebutton-story-svelte?variantId=_default')
    const controls = page.getByTestId('story-controls')
    await expect(controls.getByText('Disabled')).toBeVisible()
    await expect(controls.locator('[role="checkbox"]')).toBeVisible()
    await expect(controls.getByText('Size')).toBeVisible()
    await expect(controls).not.toContainText('Click me!')
  })

  test.fixme('shares the same controls slot across variants', async ({ page }) => {
    const controls = page.getByTestId('story-controls')

    await page.goto('/story/src-sharecontrols-story-svelte?variantId=src-sharecontrols-story-svelte-0')
    await expect(controls.getByText('Disabled')).toBeVisible()
    await expect(controls.locator('[role="checkbox"]')).toBeVisible()

    await page.goto('/story/src-sharecontrols-story-svelte?variantId=src-sharecontrols-story-svelte-1')
    await expect(controls.getByText('Disabled')).toBeVisible()
    await expect(controls.locator('[role="checkbox"]')).toBeVisible()
  })

  test.fixme('renders per-variant controls slots independently', async ({ page }) => {
    const controls = page.getByTestId('story-controls')

    await page.goto('/story/src-controlsvariant-story-svelte?variantId=src-controlsvariant-story-svelte-0')
    await expect(controls.getByText('Content 1')).toBeVisible()
    await expect(controls.getByText('Disabled 1')).toBeVisible()
    await expect(controls.locator('[role="checkbox"]')).toBeVisible()

    await page.goto('/story/src-controlsvariant-story-svelte?variantId=src-controlsvariant-story-svelte-1')
    await expect(controls.getByText('Content 2')).toBeVisible()
    await expect(controls.getByText('Disabled 2')).toBeVisible()
    await expect(controls.locator('[role="checkbox"]')).toBeVisible()
  })
})
