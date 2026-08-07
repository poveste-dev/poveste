// This example doubles as the consumer-side Tailwind v4 fixture: the story
// stylesheet imports Tailwind (preflight included) to prove it stays scoped to
// story containers and never restyles poveste's own chrome.
module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
  ],
}
