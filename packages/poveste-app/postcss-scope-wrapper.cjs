function isImportRule(node) {
  return node.type === 'atrule' && node.name === 'import'
}

// Inside `@scope (:root) to (…)` a bare `html` / `:root` selector matches
// nothing — the scoping root has to be addressed as `:scope`.
const ROOT_SELECTORS = ['html', ':root']

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
