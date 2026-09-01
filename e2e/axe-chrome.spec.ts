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
 * `color-contrast` is excluded, and it is the one exclusion here.
 *
 * The contrast failure #310 measured — white on the brand green in the selected
 * story-list item — is fixed. What remains is six light-mode failures elsewhere:
 * the brand green as text on white (2.53:1), the inactive control tabs (3.35:1),
 * and two spans of shiki's syntax highlighting (4.43:1, against a 4.5 threshold).
 *
 * Those are palette and theme choices rather than markup, and picking new colours
 * is a design decision with its own issue. Everything else this spec covers is
 * structural, which is why the rest is asserted at zero rather than baselined.
 */
const EXCLUDED_RULES = { 'color-contrast': { enabled: false } }

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
