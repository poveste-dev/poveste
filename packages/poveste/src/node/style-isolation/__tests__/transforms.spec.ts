import { describe, expect, it } from 'vitest'
import { isGlobalImport, wrapChromeCss, wrapUserCss } from '../transforms.js'

/** Selectors of every rule inside the wrap, so a test can assert on them whole. */
function selectorsIn(css: string): string[] {
  return css.split('{')
    .slice(0, -1)
    .map(chunk => chunk.slice(chunk.lastIndexOf('}') + 1).trim())
    .filter(selector => selector.length > 0 && !selector.startsWith('@'))
}

describe('wrapUserCss', () => {
  it('wraps a single rule in @scope (.scope-root)', () => {
    const out = wrapUserCss('main { color: red }', { scopeRoot: '.__poveste-render-story' })
    expect(out).toContain('@scope (.__poveste-render-story)')
    expect(out).toContain('main')
    expect(out).toContain('color: red')
  })

  // Every root spelling has to land on :scope. A rule left as `html`/`body`
  // targets an ancestor of the scoping root and can never match — silently,
  // which is what made #116 survive this long. Asserting the whole selector
  // rather than "contains :scope": the failure mode is a leftover `html`, and
  // a substring check passes right over it.
  it.each([
    [':root', ':root { --brand: rebeccapurple }', ':scope'],
    ['html', 'html { --brand: rebeccapurple }', ':scope'],
    ['body', 'body { --brand: rebeccapurple }', ':scope'],
    ['BODY', 'BODY { --brand: rebeccapurple }', ':scope'],
    ['body .card', 'body .card { --brand: rebeccapurple }', ':scope .card'],
    ['body.dark .card', 'body.dark .card { --brand: rebeccapurple }', ':scope.dark .card'],
    ['.body-copy', '.body-copy { --brand: rebeccapurple }', '.body-copy'],
    ['.page-html', '.page-html { --brand: rebeccapurple }', '.page-html'],
  ])('compiles %s to a selector that can still match', (_input, css, expected) => {
    const out = wrapUserCss(css, { scopeRoot: '.__poveste-render-story' })

    expect(selectorsIn(out)).toEqual([expected])
  })

  it('rewrites root selectors nested in at-rules', () => {
    const out = wrapUserCss('@media (min-width: 700px) { body { --brand: rebeccapurple } }', {
      scopeRoot: '.__poveste-render-story',
    })

    expect(selectorsIn(out)).toEqual([':scope'])
  })

  // `:is()` and `:where()` are plain selector lists, so a root inside one still
  // means the root (#124).
  it.each([
    [':is(html, body)', ':is(html, body) { --brand: rebeccapurple }', ':is(:scope, :scope)'],
    [':where(:root)', ':where(:root) { --brand: rebeccapurple }', ':where(:scope)'],
    // lightningcss collapses a single-argument `:is()`; same specificity.
    [':is(html)', ':is(html) { --brand: rebeccapurple }', ':scope'],
    [':is(.a, body) .card', ':is(.a, body) .card { --brand: rebeccapurple }', ':is(.a, :scope) .card'],
    [':is(.a, :where(body))', ':is(.a, :where(body)) { --brand: rebeccapurple }', ':is(.a, :where(:scope))'],
  ])('rewrites a root inside %s', (_input, css, expected) => {
    const out = wrapUserCss(css, { scopeRoot: '.__poveste-render-story' })

    expect(selectorsIn(out)).toEqual([expected])
  })

  // Rewriting inside a negation would change what the rule matches rather than
  // fix it, so the walk stops at `:not()`/`:has()` — including an `:is()` nested
  // inside one. A namespaced root is skipped for a different reason: the prefix
  // is its own part, and `*|:scope` is invalid CSS the browser drops outright.
  it.each([
    [':not()', '.card:not(body) { --brand: rebeccapurple }', '.card:not(body)'],
    [':has()', '.card:has(body) { --brand: rebeccapurple }', '.card:has(body)'],
    ['an :is() nested in :not()', '.card:not(:is(html)) { --brand: rebeccapurple }', '.card:not(:is(html))'],
    ['nth-child(… of S)', 'li:nth-child(1 of body) { --brand: rebeccapurple }', 'li:nth-child(1 of body)'],
    ['any namespace', 'body { color: red }\n*|body { --brand: rebeccapurple }', '*|body'],
    ['a named namespace', 'body { color: red }\nsvg|body { --brand: rebeccapurple }', 'svg|body'],
    ['the empty namespace', 'body { color: red }\n|body { --brand: rebeccapurple }', '|body'],
  ])('leaves a root inside %s alone', (_input, css, expected) => {
    const out = wrapUserCss(css, { scopeRoot: '.__poveste-render-story' })

    expect(selectorsIn(out)).toContain(expected)
  })

  it('leaves :scope alone (idempotent)', () => {
    const out = wrapUserCss(':scope { color: red }', {
      scopeRoot: '.__poveste-render-story',
    })
    expect(out).toContain(':scope')
    expect(out).not.toContain(':scope:scope')
  })

  it('hoists @import outside the @scope block', () => {
    const css = `@import url('https://fonts.googleapis.com/css2?family=Foo');\nbody { color: red }`
    const out = wrapUserCss(css, { scopeRoot: '.__poveste-render-story' })
    expect(out.indexOf('@import')).toBeLessThan(out.indexOf('@scope'))
  })

  it('does not double-wrap CSS that already starts with @scope', () => {
    const input = wrapUserCss('body { color: red }', { scopeRoot: '.__poveste-render-story' })
    const out = wrapUserCss(input, { scopeRoot: '.__poveste-render-story' })
    const occurrences = (out.match(/@scope/g) ?? []).length
    expect(occurrences).toBe(1)
  })

  // #173. Page-level rules stop at the controls slot, which carries the same
  // scope-root class as the story body; author-written rules still reach it.
  describe('with excludeRootClass', () => {
    const opts = {
      scopeRoot: '.__poveste-render-story',
      excludeRootClass: '__poveste-controls-slot',
    }

    it.each([
      [':root', ':root { background: deeppink }', ':scope:not(.__poveste-controls-slot)'],
      ['html', 'html { background: deeppink }', ':scope:not(.__poveste-controls-slot)'],
      ['body', 'body { background: deeppink }', ':scope:not(.__poveste-controls-slot)'],
      ['body .card', 'body .card { color: red }', ':scope:not(.__poveste-controls-slot) .card'],
    ])('keeps a page-level %s rule out of the controls slot', (_name, css, expected) => {
      expect(selectorsIn(wrapUserCss(css, opts))).toEqual([expected])
    })

    it.each([
      ['.user-card { background: deeppink }', '.user-card'],
      ['.body-copy { color: red }', '.body-copy'],
    ])('leaves the author-written %s alone', (css, expected) => {
      expect(selectorsIn(wrapUserCss(css, opts))).toEqual([expected])
    })

    it('carries the exclusion into roots nested in :is()', () => {
      const out = wrapUserCss(':is(html, body) { color: red }', opts)

      expect(selectorsIn(out)).toEqual([
        ':is(:scope:not(.__poveste-controls-slot), :scope:not(.__poveste-controls-slot))',
      ])
    })

    it('is opt-in, so the chrome pass is unaffected', () => {
      expect(selectorsIn(wrapUserCss('body { color: red }', { scopeRoot: '.x' }))).toEqual([':scope'])
    })
  })
})

describe('wrapChromeCss', () => {
  it('wraps in @scope (root) to (lower)', () => {
    const out = wrapChromeCss('body { color: red }', {
      scopeRoot: '.poveste-app-root',
      scopeLower: '.__poveste-render-story',
    })
    expect(out).toContain('@scope (.poveste-app-root) to (.__poveste-render-story)')
    expect(out).toContain('color: red')
  })

  // Same rule as the user side: inside the wrap, `body` means the app's root
  // container, which is what :scope resolves to (#102).
  it('rewrites html and body to :scope', () => {
    const out = wrapChromeCss('body { font-size: .875rem }\nhtml { color-scheme: dark }', {
      scopeRoot: '.poveste-app-root',
      scopeLower: '.__poveste-render-story',
    })
    expect(out).toContain(':scope')
    expect(out).not.toMatch(/(?:^|[\s,{])(?:html|body)\b/m)
  })

  it('hoists @import to the top, outside @scope', () => {
    const css = `@import url('reset.css');\nbody { color: red }`
    const out = wrapChromeCss(css, {
      scopeRoot: '.poveste-app-root',
      scopeLower: '.__poveste-render-story',
    })
    const importIdx = out.indexOf('@import')
    const scopeIdx = out.indexOf('@scope')
    expect(importIdx).toBeGreaterThanOrEqual(0)
    expect(scopeIdx).toBeGreaterThan(importIdx)
  })

  it('hoists @font-face above @scope', () => {
    const css = `@font-face { font-family: A; src: url('a.woff2') }\nbody { font-family: A }`
    const out = wrapChromeCss(css, {
      scopeRoot: '.poveste-app-root',
      scopeLower: '.__poveste-render-story',
    })
    expect(out.indexOf('@font-face')).toBeLessThan(out.indexOf('@scope'))
  })

  it('preserves an arbitrary scopeLower selector in the @scope prelude', () => {
    const out = wrapChromeCss('body { color: red }', {
      scopeRoot: '.poveste-app-root',
      scopeLower: '.__poveste-render-story:not(.__poveste-render-custom-controls)',
    })
    expect(out).toContain('@scope (.poveste-app-root) to (.__poveste-render-story:not(.__poveste-render-custom-controls))')
  })
})

describe('isGlobalImport', () => {
  it('returns true for ids ending in ?global', () => {
    expect(isGlobalImport('/abs/path/foo.css?global')).toBe(true)
    expect(isGlobalImport('foo.css?global&bar')).toBe(true)
  })
  it('returns false otherwise', () => {
    expect(isGlobalImport('/abs/path/foo.css')).toBe(false)
    expect(isGlobalImport('foo.css?inline')).toBe(false)
  })
})
