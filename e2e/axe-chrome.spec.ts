import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

/*
 * The book chrome failed 10 axe rules, 7 of them serious (#310) — a contrast
 * failure on the brand colour, an untitled sandbox iframe, unnamed icon links,
 * a `role="checkbox"` with no `aria-checked`, and most of the page outside any
 * landmark. Every book a user publishes inherited all of it.
 *
 * Asserted against a real built book rather than a component harness, because
 * several of these only exist once the whole chrome is assembled: `region` is
 * about what is *not* inside a landmark, and `landmark-one-main` about there
 * being exactly one.
 *
 * The sandbox is deliberately not asserted here. It reports `landmark-one-main`
 * and `page-has-heading-one`, and both are category errors: a document rendering
 * one isolated component is not a page and should not be given a fake `<main>`
 * or `<h1>` to satisfy them. Which rules are meaningful in the sandbox is #162's
 * decision, and #310 records it so it is not discovered during that work.
 */
// Playwright runs from the repo root, and these specs are not ES modules, so
// `import.meta` is unavailable here.
const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const STORY = 'conformance-button'

/*
 * Nothing is excluded, and `color-contrast` in particular is not.
 *
 * It was, for the six light-mode failures #533 lists — the brand green as text,
 * the dimmed control tabs, and shiki's tag colour. All six are fixed, and the
 * exclusion came out with them: an exclusion shaped exactly like the known
 * failures is a guard with a hole where the bugs are, which is how the same
 * defect kept being found by hand rather than by CI.
 *
 * It is also what holds two of those fixes in place. The theme patch in
 * `app/util/highlighter.ts` reverts silently if a shiki upgrade restructures
 * the theme, and the dimmed tabs are a computed opacity rather than a colour
 * token — neither is visible in a diff, and both fail here.
 */
const EXCLUDED_RULES = {}

test('the book chrome has no axe violations', async ({ page }) => {
  await openStory(page, STORY, '?variantId=default')
  await expect(page.getByTestId('preview-iframe')).toBeVisible()

  // The shell fades in from `opacity: 0` to avoid a flash of content, and axe
  // measures contrast against whatever is behind a half-transparent element —
  // so running mid-fade reports contrast failures that do not exist once it
  // settles. Wait for the fade rather than for a duration.
  await page.waitForFunction(() => {
    const root = document.querySelector('.poveste-app-root')?.nextElementSibling as HTMLElement | null
    return !root || Number.parseFloat(getComputedStyle(root).opacity) === 1
  })

  // Contrast is a property of the settled UI. A half-transparent element
  // composites against what is behind it, so axe run mid-transition reports a
  // colour nothing ever renders — the source-mode labels cross-fade over 300ms
  // and were caught at 2.01:1 on their way in. Ending transitions is what makes
  // the measurement the one a reader sees; the fade wait cannot help, because
  // these start when the panel does.
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important }' })

  await page.addScriptTag({ content: AXE })
  const results = await page.evaluate(
    async rules => (window as any).axe.run(document, { rules }),
    EXCLUDED_RULES,
  )

  // Report the offending node and the reason, not just a count — a bare number
  // tells whoever hits this nothing about what regressed.
  const detail = results.violations.flatMap((violation: any) =>
    violation.nodes.map((node: any) =>
      `${violation.id} :: ${node.target[0]} :: ${(node.failureSummary ?? '').split('\n')[1]?.trim()}`,
    ),
  )

  expect(detail).toEqual([])
})

/*
 * The default layout was the only state the check above visited, and the `h1`
 * and banner both lived in `AppHeader` — which this layout does not render. So
 * the fix passed while hiding the story list still produced a page with no
 * heading and no banner. A rule engine only reports on the state you put in
 * front of it.
 */
test('the book chrome has no axe violations with the story list hidden', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('_poveste-layout-v1', JSON.stringify({
      storyListVisible: false,
      storyOptionsVisible: true,
      storyOptionsPlacement: 'right',
    }))
  })

  // Not `openStory`: it waits for a story-list item, and this layout has none.
  await page.goto(`/story/${STORY}?variantId=default`)
  await expect(page.locator('.poveste-toolbar-title')).toBeVisible()
  await expect(page.getByTestId('preview-iframe')).toBeVisible()
  await expect(page.locator('[data-testid="story-list-item"]')).toHaveCount(0)

  // Contrast is a property of the settled UI. A half-transparent element
  // composites against what is behind it, so axe run mid-transition reports a
  // colour nothing ever renders — the source-mode labels cross-fade over 300ms
  // and were caught at 2.01:1 on their way in. Ending transitions is what makes
  // the measurement the one a reader sees; the fade wait cannot help, because
  // these start when the panel does.
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important }' })

  const results = await page.evaluate(
    async ({ rules, axe }) => {
      const script = document.createElement('script')
      script.textContent = axe
      document.head.append(script)
      return (window as any).axe.run(document, { rules })
    },
    { rules: EXCLUDED_RULES, axe: AXE },
  )

  const detail = results.violations.flatMap((violation: any) =>
    violation.nodes.map((node: any) =>
      `${violation.id} :: ${node.target[0]} :: ${(node.failureSummary ?? '').split('\n')[1]?.trim()}`,
    ),
  )

  expect(detail).toEqual([])
})
