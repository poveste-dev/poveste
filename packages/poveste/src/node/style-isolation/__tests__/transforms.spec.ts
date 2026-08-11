import { describe, expect, it } from 'vitest'
import { isGlobalImport, wrapChromeCss, wrapUserCss } from '../transforms.js'

describe('wrapUserCss', () => {
  it('wraps a single rule in @scope (.scope-root)', () => {
    const out = wrapUserCss('main { color: red }', { scopeRoot: '.__poveste-render-story' })
    expect(out).toContain('@scope (.__poveste-render-story)')
    expect(out).toContain('main')
    expect(out).toContain('color: red')
  })

  // Every root spelling has to land on :scope. A rule left as `html`/`body`
  // targets an ancestor of the scoping root and can never match — silently,
  // which is what made #116 survive this long.
  it.each([
    ['body', 'body { font-size: 14px }', 'font-size: 14px'],
    ['html', 'html { --brand: rebeccapurple }', '--brand: rebeccapurple'],
    [':root', ':root { --brand: rebeccapurple }', '--brand: rebeccapurple'],
  ])('rewrites %s → :scope so the rule can still match', (_name, css, decl) => {
    const out = wrapUserCss(css, { scopeRoot: '.__poveste-render-story' })
    expect(out).toContain(':scope')
    expect(out).toContain(decl)
    expect(out).not.toMatch(/(?:^|[\s,{])(?:html|body)\b/m)
  })

  it('rewrites a root selector that leads a descendant chain', () => {
    const out = wrapUserCss('body .card { color: red }\nbody.dark .card { color: blue }', {
      scopeRoot: '.__poveste-render-story',
    })
    expect(out).toContain(':scope .card')
    expect(out).toContain(':scope.dark .card')
  })

  it('rewrites root selectors nested in at-rules', () => {
    const out = wrapUserCss('@media (min-width: 700px) { body { color: red } }', {
      scopeRoot: '.__poveste-render-story',
    })
    expect(out).toContain(':scope')
    expect(out).not.toMatch(/(?:^|[\s,{])body\b/m)
  })

  it('leaves element selectors that merely contain a root name alone', () => {
    const out = wrapUserCss('.body-copy { color: red }\n.page-html { color: blue }', {
      scopeRoot: '.__poveste-render-story',
    })
    expect(out).toContain('.body-copy')
    expect(out).toContain('.page-html')
    expect(out).not.toContain(':scope')
  })

  it('rewrites :root → :scope inside the scope', () => {
    const out = wrapUserCss(':root { --color-primary: blue }', {
      scopeRoot: '.__poveste-render-story',
    })
    expect(out).toContain(':scope')
    expect(out).not.toContain(':root')
    expect(out).toContain('--color-primary: blue')
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
