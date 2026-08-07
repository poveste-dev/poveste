module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
    // Chrome/story CSS isolation (#27): wrap the compiled stylesheet in
    // @scope (:root) to (.__poveste-render-story…). Must run AFTER Tailwind so
    // it also scopes v4's generated theme/utilities output.
    require('./postcss-scope-wrapper.cjs')({ from: ':root', to: '.__poveste-render-story:not(.__poveste-render-custom-controls)' }),
  ],
}
