import { expect, test } from '@playwright/test'

// Shiki only warns once it has seen 10 live instances, so this has to cross
// that threshold within a single page context.
const MOUNTS_REQUIRED = 14

test('reuses one Shiki highlighter across story navigation', async ({ page }) => {
  // Walking 14 stories, some of them large grids, does not fit the default 30s.
  test.setTimeout(120_000)

  const shikiWarnings: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    if (text.includes('Shiki') && text.includes('instances have been created')) {
      shikiWarnings.push(text)
    }
  })

  // Load once, then navigate only by clicking: a `page.goto` per story would
  // tear down the JS context each time and reset Shiki's instance counter,
  // which is exactly the leak this guards against.
  await page.goto('/')

  const storyLinks = page.getByTestId('story-list-item')
  await expect(storyLinks.first()).toBeVisible()

  const sourceCode = page.getByTestId('story-source-code')
  const variants = page.getByTestId('story-variant-list-item')

  let mounts = 0
  const storyCount = await storyLinks.count()

  for (let i = 0; i < storyCount && mounts < MOUNTS_REQUIRED; i++) {
    await storyLinks.nth(i).click()

    // Single-variant stories auto-select and land straight on the pane;
    // multi-variant ones open a grid and need a variant picked first.
    if (await variants.count()) {
      await variants.first().click()
    }

    // Docs-only stories never mount the pane at all — skip them rather than
    // letting the walk stall on one.
    const mounted = await sourceCode.waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false)
    if (mounted) {
      mounts++
    }
  }

  expect(mounts).toBe(MOUNTS_REQUIRED)
  expect(shikiWarnings).toEqual([])
})

test('highlights in both color schemes from the one shared instance', async ({ page }) => {
  await page.goto('/story/src-components-codegen-story-vue?variantId=html')

  const code = page.getByTestId('story-source-code')
  await expect(code).toBeVisible()

  // Distinct token colours prove Shiki actually themed the block, rather than
  // the pane falling back to unhighlighted text.
  const tokenColors = () => code.locator('span[style*="color"]').evaluateAll(nodes =>
    [...new Set(nodes.map(node => (node as HTMLElement).style.color))].sort(),
  )

  const light = await tokenColors()
  expect(light.length).toBeGreaterThan(1)

  // Toggle dark mode by its shortcut — the top bar control is an icon with no
  // accessible name to target.
  await page.keyboard.press('ControlOrMeta+Shift+D')
  await expect(page.locator('html')).toHaveClass(/ptw-dark/)

  await expect.poll(tokenColors).not.toEqual(light)
  expect((await tokenColors()).length).toBeGreaterThan(1)
})
