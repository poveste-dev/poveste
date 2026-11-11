import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { openStory, seedPreviewSettings } from './support.js'

/*
 * The accessibility panel runs axe-core in the sandbox the variant renders in,
 * through the app's own path: the panel asks, the realm loads axe and answers.
 * Injecting axe from the test would skip the part that has to work, and reaches
 * only some of a grid's realms besides (#162).
 *
 * The first test is the clean baseline #310 asked for: a plain button reports
 * nothing, so whatever the panel reports in a book is the story's, not Poveste's.
 */
const STORY = 'conformance-button'
const A11Y_TAB = 'tab=a11y'

// A first run loads axe into the realm; ceilings, not waits.
const RUN_TIMEOUT = 20_000

/** Each violation the panel shows, as `rule :: element`, so a failure names what regressed. */
async function violations(page: Page): Promise<string[]> {
  const panel = page.getByTestId('story-a11y')
  await expect(panel).toHaveAttribute('data-status', 'done', { timeout: RUN_TIMEOUT })
  return panel.getByTestId('a11y-violation').evaluateAll(items => items.map(item =>
    `${item.getAttribute('data-rule')} :: ${[...item.querySelectorAll('[data-slot="target"]')].map(target => target.textContent).join(', ')}`,
  ))
}

/** Requests for axe or the code that runs it, which only the panel may cause. */
function recordAxeRequests(page: Page): string[] {
  const seen: string[] = []
  page.on('request', (request) => {
    if (/axe|a11y-run/.test(new URL(request.url()).pathname)) {
      seen.push(request.url())
    }
  })
  return seen
}

test.describe('accessibility panel', () => {
  test('finds nothing in a plain button, so nothing Poveste adds is reported', async ({ page }) => {
    await openStory(page, STORY, `?variantId=default&${A11Y_TAB}`)

    expect(await violations(page)).toEqual([])
    await expect(page.getByTestId('a11y-summary')).toContainText('No violations found')
  })

  test('reports what the component gets wrong, with its impact, element and help', async ({ page }) => {
    await openStory(page, STORY, `?variantId=default&${A11Y_TAB}`)
    expect(await violations(page)).toEqual([])

    // An empty label leaves the button with no name. Back to the panel by history,
    // which keeps the state a reload would reset.
    await page.getByRole('link', { name: 'Controls', exact: true }).first().click()
    await page.getByTestId('story-controls').locator('.poveste-wrapper').filter({ hasText: 'Text' }).locator('input').fill('')
    await page.goBack()

    expect(await violations(page)).toEqual([expect.stringMatching(/^button-name :: /)])
    const violation = page.getByTestId('a11y-violation')
    await expect(violation).toHaveAttribute('data-impact', 'critical')
    // The selector is axe's shortest, which differs by framework; the markup names the button.
    await expect(violation.locator('[data-slot="html"]')).toContainText('conformance-button')
    await expect(violation.locator('[data-slot="help"]')).toHaveAttribute('href', /\/button-name/)
  })

  test('loads axe only when the panel asks', async ({ page }) => {
    const requests = recordAxeRequests(page)

    await openStory(page, STORY, '?variantId=default')
    await expect(page.getByTestId('preview-iframe').contentFrame().locator('.conformance-button')).toBeVisible()
    expect(requests).toEqual([])

    await openStory(page, STORY, `?variantId=default&${A11Y_TAB}`)
    expect(await violations(page)).toEqual([])
    expect(requests).not.toEqual([])
  })

  // The sandbox is transparent and the app paints the dark surface behind it. axe
  // sees only the sandbox, so without that colour it measured light text against
  // white and reported the story's dark-mode text as failing contrast.
  test('measures contrast against the background the preview shows', async ({ page }) => {
    await seedPreviewSettings(page, { colorScheme: 'dark', backgroundColor: 'transparent' })

    await openStory(page, 'conformance-dark', `?variantId=default&${A11Y_TAB}`)

    expect(await violations(page)).toEqual([])
  })

  // A grid can hold dozens of realms, and loading axe in each is the cost #162 measured.
  test('runs only when asked in a grid', async ({ page }) => {
    const requests = recordAxeRequests(page)

    await openStory(page, 'conformance-grid', `?variantId=one&${A11Y_TAB}`)
    const panel = page.getByTestId('story-a11y')
    await expect(panel).toHaveAttribute('data-status', 'idle')
    expect(requests).toEqual([])

    await panel.getByRole('button', { name: 'Check this variant' }).click()

    expect(await violations(page)).toEqual([])
    expect(requests).not.toEqual([])
  })

  test('the panel passes axe itself, with a violation showing', async ({ page }) => {
    await openStory(page, STORY, `?variantId=default&${A11Y_TAB}`)
    expect(await violations(page)).toEqual([])
    await page.getByRole('link', { name: 'Controls', exact: true }).first().click()
    await page.getByTestId('story-controls').locator('.poveste-wrapper').filter({ hasText: 'Text' }).locator('input').fill('')
    await page.goBack()
    expect(await violations(page)).toHaveLength(1)
    await page.locator('[data-slot="rules-off"] summary').click()

    // As `axe-chrome.spec.ts` does: settled, with transitions ended.
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important }' })
    await page.addScriptTag({ content: readFileSync('node_modules/axe-core/axe.min.js', 'utf8') })
    const results = await page.evaluate(async () => (window as any).axe.run('[data-testid="story-a11y"]'))

    const detail = results.violations.flatMap((violation: any) =>
      violation.nodes.map((node: any) => `${violation.id} :: ${node.target[0]}`),
    )
    expect(detail).toEqual([])
  })
})
