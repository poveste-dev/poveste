import { Buffer } from 'node:buffer'
import { transform as lightningcssTransform } from 'lightningcss'

export interface WrapOptions {
  scopeRoot: string
  /**
   * Bare class name the rewritten page-level selectors must not match, so
   * `body`/`:root` rules stop at the story and never reach the controls slot,
   * which carries the same scope-root class (#173).
   */
  excludeRootClass?: string
}

export interface WrapWithLowerOptions {
  scopeRoot: string
  scopeLower: string
}

export function wrapUserCss(css: string, opts: WrapOptions): string {
  const trimmed = css.trimStart()
  if (trimmed.startsWith('@scope')) {
    return css
  }
  const { hoisted, remainder } = extractHoistableAtRules(css)
  const body = hasRootSelector(remainder)
    ? rewriteRootToScope(remainder, opts.excludeRootClass)
    : remainder
  const hoistedBlock = hoisted.length > 0 ? `${hoisted.join('\n')}\n` : ''
  return `${hoistedBlock}@scope (${opts.scopeRoot}) {\n${body}\n}\n`
}

export function wrapChromeCss(css: string, opts: WrapWithLowerOptions): string {
  const trimmed = css.trimStart()
  if (trimmed.startsWith('@scope (')) {
    return css
  }
  const { hoisted, remainder } = extractHoistableAtRules(css)
  // Rewrite root selectors to `:scope` so source-level `@scope (:root) to (...)`
  // rules nest correctly under the outer scope; without this, the inner
  // `:root` resolves to the document root which is outside the outer scope.
  const body = hasRootSelector(remainder)
    ? rewriteRootToScope(remainder)
    : remainder
  const hoistedBlock = hoisted.length > 0 ? `${hoisted.join('\n')}\n` : ''
  return `${hoistedBlock}@scope (${opts.scopeRoot}) to (${opts.scopeLower}) {\n${body}\n}\n`
}

export function isGlobalImport(id: string): boolean {
  const q = id.indexOf('?')
  if (q === -1) return false
  const parts = id.slice(q + 1).split('&')
  return parts.includes('global') || parts.some(p => p.startsWith('global='))
}

// `html` and `body` sit above the scoping root once the sheet is wrapped, so a
// rule targeting either can never match. Inside a story they mean the same
// thing `:root` does — the one root there is — which is what `:scope`
// resolves to. Leaving them out made `body { font-size: 14px }` inert with no
// error (#116); the chrome wrapper learned the same lesson in #102.
const ROOT_TYPE_SELECTORS = new Set(['html', 'body'])

// Only a gate on the lightningcss round-trip, so a false positive costs a
// reparse and nothing else. Word-bounded to skip `.sidebar-body` and friends;
// `(` is a boundary too, or a sheet whose only root is `:is(html)` would skip
// the pass that exists to rewrite it.
const ROOT_SELECTOR_RE = /:root|(?:^|[\s,{}>+~(])(?:html|body)\b/i

function hasRootSelector(css: string): boolean {
  return ROOT_SELECTOR_RE.test(css)
}

// Type selectors are ASCII case-insensitive against HTML and lightningcss
// reports the name as authored, so `BODY { … }` arrives spelled `BODY`.
function isRootTypeSelector(name: string): boolean {
  return ROOT_TYPE_SELECTORS.has(name.toLowerCase())
}

// Matching pseudo-classes we descend into. `:is()` and `:where()` are plain
// selector lists, so a root inside one still means the root.
//
// `:not()` and `:has()` are deliberately absent, and the recursion stops at
// them entirely rather than skipping one level (#124). Negation inverts the
// rewrite instead of fixing it: `.card:not(body)` today excludes nothing inside
// a story, while `.card:not(:scope)` would start excluding the story root — a
// behaviour change, silent in exactly the way the original bug was. `:has()` is
// relational and has the same problem. `:nth-child(… of S)` keeps its list
// under `of` rather than `selectors`, so it is untouched for free.
const DESCENDABLE_PSEUDO_CLASSES = new Set(['is', 'where'])

const SCOPE_PART = { type: 'pseudo-class', kind: 'scope' }

// Structural stand-in for lightningcss's selector component union, which is not
// exported in a form that survives the nesting below.
interface SelectorPart {
  type: string
  kind?: string
  name?: string
  selectors?: SelectorPart[][]
}

// Only rewritten roots carry the exclusion, so an author's own classes still
// apply in the controls slot.
function scopeParts(excludeClass?: string): SelectorPart[] {
  if (!excludeClass) {
    return [SCOPE_PART]
  }
  return [SCOPE_PART, {
    type: 'pseudo-class',
    kind: 'not',
    selectors: [[{ type: 'class', name: excludeClass }]],
  }]
}

function rewriteSelector(selector: SelectorPart[], excludeClass?: string): SelectorPart[] {
  return selector.flatMap((part, index) => {
    if (part.type === 'pseudo-class' && part.kind === 'root') {
      return scopeParts(excludeClass)
    }
    // A namespace is its own part, immediately before the type selector it
    // qualifies. Rewriting past it emits `*|:scope`, which is invalid — a
    // prefix cannot qualify a pseudo-class — and the browser drops the rule.
    // `svg|body` also means a body in the SVG namespace, which is not the
    // document root, so leaving these alone is right on both counts.
    if (part.type === 'type' && isRootTypeSelector(part.name ?? '')) {
      return selector[index - 1]?.type === 'namespace' ? [part] : scopeParts(excludeClass)
    }
    if (part.type === 'pseudo-class' && DESCENDABLE_PSEUDO_CLASSES.has(part.kind ?? '') && part.selectors) {
      return [{ ...part, selectors: part.selectors.map(s => rewriteSelector(s, excludeClass)) }]
    }
    return [part]
  })
}

function rewriteRootToScope(css: string, excludeClass?: string): string {
  const processed = lightningcssTransform({
    filename: 'user.css',
    code: Buffer.from(css, 'utf8'),
    minify: false,
    visitor: {
      Selector: selector => rewriteSelector(selector as SelectorPart[], excludeClass) as typeof selector,
    },
  })
  return Buffer.from(processed.code).toString('utf8')
}

// Top-level at-rule extraction. Anchored to line start with optional leading
// whitespace; covers the formatted output produced by Vite/PostCSS. Inputs
// with rules on the same line as other rules, or strings/comments containing
// `;`/`}`, are not handled — these are extremely rare in practice and would
// only mis-classify within a generated poveste-app or vendor stylesheet.
const HOIST_SEMI_RE = /^[ \t]*@(?:import|charset|namespace)\s[^;]+;[ \t]*\n?/gm
const HOIST_FONT_FACE_RE = /^[ \t]*@font-face\s*\{[^}]*\}[ \t]*\n?/gm

function extractHoistableAtRules(css: string): { hoisted: string[], remainder: string } {
  const hoisted: string[] = []
  let remainder = css

  remainder = remainder.replace(HOIST_SEMI_RE, (match) => {
    hoisted.push(match.trim())
    return ''
  })
  remainder = remainder.replace(HOIST_FONT_FACE_RE, (match) => {
    hoisted.push(match.trim())
    return ''
  })

  return { hoisted, remainder }
}
