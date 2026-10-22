// The controls' compiled stylesheet, as a book's chrome would load it. `src/style/main.css`
// is Tailwind 4 source: this book has no PostCSS config to compile it, so its `@theme`
// defined no tokens and its utilities import added none, and the controls rendered
// unstyled in every sandboxed story (#984).
import '@poveste/controls/dist/style-standalone.css'
