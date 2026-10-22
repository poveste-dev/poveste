// Tailwind 3's shape and its refusal: a pack of legacy function plugins, failing on a
// `@layer utilities` or `@layer components` in a file with no matching `@tailwind` directive.
// It also marks what it processed, so a spec can tell the book's own CSS still went through it.
function layers(root) {
  const directives = new Set()
  root.walkAtRules('tailwind', (rule) => {
    directives.add(rule.params.trim())
    rule.remove()
  })
  root.walkAtRules('layer', (rule) => {
    const name = rule.params.trim()
    if ((name === 'utilities' || name === 'components') && rule.nodes && !directives.has(name)) {
      throw rule.error(`\`@layer ${name}\` is used but no matching \`@tailwind ${name}\` directive is present.`)
    }
  })
  root.walkDecls('content', (decl) => {
    decl.value = decl.value.replace('before', 'processed')
  })
}

module.exports = { postcssPlugin: 'tailwindcss', plugins: [layers] }
