function isImportRule(node) {
  return node.type === 'atrule' && node.name === 'import'
}

// Inside `@scope (:root) to (…)` a bare `html` / `:root` / `body` selector
// matches nothing — the scoping root has to be addressed as `:scope`.
//
// `body` belongs here for the same reason `html` does, even though it is not
// the document root. poveste re-wraps this stylesheet a second time, rooted at
// `.poveste-app-root`, so by the time it reaches the browser both `html` and
// `body` sit *above* the effective scoping root and neither can be matched.
// Chrome rules that target them mean "the app's root container", which is what
// `:scope` resolves to. Leaving `body` out left `body { font-size: .875rem }`
// inert and rendered the entire UI one size too large (#102).
const ROOT_SELECTORS = ['html', ':root', 'body']

function scopeRootSelectors(rule) {
  rule.selectors = rule.selectors
    .map(selector => (ROOT_SELECTORS.includes(selector) ? ':scope' : selector))
}

module.exports = (opts = {}) => {
  const { from = ':root', to } = opts
  let params = `(${from})`
  if (to) {
    params += ` to (${to})`
  }

  return {
    postcssPlugin: 'postcss-scope-wrapper',
    Once(root, { AtRule }) {
      const scopeRule = new AtRule({
        name: 'scope',
        params,
      })

      const nodesToMove = root.nodes.filter(node => !isImportRule(node))

      nodesToMove.forEach((node) => {
        scopeRule.append(node)
      })

      root.append(scopeRule)

      // Walk, rather than only rewriting top-level rules: Tailwind v4 emits
      // `@layer base { html { … } }` as a real cascade layer instead of
      // inlining it the way the v3 `@layer` directive did, so the rules that
      // style the scoping root are nested one level down. Missing them left
      // `html { font-family: … }` inert and the whole UI fell back to the
      // browser's default serif.
      scopeRule.walkRules(scopeRootSelectors)
    },
  }
}

module.exports.postcss = true
