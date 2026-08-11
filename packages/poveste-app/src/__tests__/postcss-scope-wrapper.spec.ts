import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
// @ts-expect-error — plain CJS postcss plugin, no types.
import scopeWrapper from '../../postcss-scope-wrapper.cjs'

const OPTS = { from: ':root', to: '.__poveste-render-story:not(.__poveste-render-custom-controls)' }

function run(css: string) {
  return postcss([scopeWrapper(OPTS)]).process(css, { from: undefined }).css
}

describe('postcss-scope-wrapper', () => {
  it('wraps the stylesheet in the configured scope', () => {
    expect(run('.a { color: red }')).toContain('@scope (:root) to (.__poveste-render-story:not(.__poveste-render-custom-controls))')
  })

  it('leaves @import at the top level', () => {
    // @import is only valid before other rules; moving it inside @scope drops it.
    const out = run('@import "x.css";\n.a { color: red }')

    expect(out.indexOf('@import')).toBeLessThan(out.indexOf('@scope'))
  })

  /*
   * The three selectors below all mean "the app's root container" once this
   * stylesheet is wrapped. `body` is included for the same reason as `html`:
   * poveste re-wraps the output a second time rooted at `.poveste-app-root`, so
   * both sit above the effective scoping root and can never be matched. Leaving
   * `body` out is #102 — the whole UI rendered one size too large.
   */
  it.each(['html', ':root', 'body'])('rewrites a root-ish `%s` selector to :scope', (selector) => {
    expect(run(`${selector} { font-size: .875rem }`)).toContain(':scope {')
  })

  it('rewrites root-ish selectors inside a selector list, leaving the rest alone', () => {
    const out = run('html, body, #app { height: 100% }')

    expect(out).toContain(':scope,')
    expect(out).toContain('#app')
    expect(out).not.toMatch(/(?<![\w.\-#])body\s*[,{]/)
  })

  it('rewrites nested rules, not just top-level ones', () => {
    // Tailwind v4 emits `@layer base { … }` as a real cascade layer, so the
    // rules that style the scoping root sit one level down.
    const out = run('@layer base { body { font-size: .875rem } }')

    expect(out).toContain(':scope {')
    expect(out).not.toMatch(/(?<![\w.\-#])body\s*\{/)
  })

  it('rewrites root-ish selectors inside media queries', () => {
    // The 640px override is where #102 actually bit.
    const out = run('@media (min-width: 640px) { body { font-size: .875rem } }')

    expect(out).toContain(':scope {')
  })

  it('leaves ordinary selectors untouched', () => {
    const out = run('.poveste-story-list { color: red }')

    expect(out).toContain('.poveste-story-list')
    expect(out).not.toContain(':scope {')
  })
})
