import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// A rule that ships, parses, appears in devtools and matches nothing.
//
// `HstSlider` styled its thumb with `@apply … dark:bg-gray-700` inside a
// `::-webkit-slider-thumb` block. Tailwind appends the dark variant to the end
// of the compound, and nothing may follow a pseudo-element but a user-action
// pseudo-class — so the browser kept the rule and threw the arguments away,
// leaving `::-webkit-slider-thumb:where()`. `:where()` with nothing in it
// matches nothing, so the thumb stayed white on a dark UI for the life of the
// control, with no warning at build time and none at run time.
//
// Checked against the live stylesheet rather than the source, because the
// source was not wrong in any way a reader could see (#955).
test.describe('shipped chrome CSS', () => {
  test('has no rule the browser emptied out', async ({ page }) => {
    await openStory(page, 'conformance-controls')

    const dead = await page.evaluate(() => {
      const found: string[] = []
      const walk = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
          const selector = (rule as CSSStyleRule).selectorText
          // `:where()` and `:is()` are forgiving: an argument they cannot use
          // here is dropped rather than invalidating the rule, so an empty one
          // is the fingerprint of arguments that went missing.
          //
          // `not-prose` is `@tailwindcss/typography`'s own marker: the plugin
          // emits `& :where():not(:where([class~="not-prose"], …))` for its
          // element lists, four of them, and they are the vendor's business
          // rather than ours. Excluded by that marker rather than by scoping
          // this to `poveste-` classes, because the rule this test exists for
          // was on `.range-input`, which a prefix filter would have missed.
          if (selector && /:(?:where|is)\(\s*\)/.test(selector) && !selector.includes('not-prose')) {
            found.push(selector)
          }
          const inner = (rule as CSSGroupingRule).cssRules
          if (inner) {
            walk(inner)
          }
        }
      }
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          walk(sheet.cssRules)
        }
        catch {
          // A cross-origin sheet cannot be read and is not ours.
        }
      }
      return found
    })

    expect(dead, 'a selector whose arguments the parser discarded matches nothing').toEqual([])
  })
})
