// Root config — used by the VitePress docs build.
// Tailwind v4 is CSS-first: the theme lives in
// docs/.vitepress/theme/style/index.pcss, not in a JS config.
module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
  ],
}
