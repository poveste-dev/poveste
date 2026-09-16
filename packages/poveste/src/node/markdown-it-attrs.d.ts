// markdown-it-attrs 4 ships no types, and `@types/markdown-it-attrs` resolves a second
// copy of markdown-it's. Delete this once #814 moves it to 5, which bundles its own.
declare module 'markdown-it-attrs' {
  import type MarkdownIt from 'markdown-it'

  const attrs: (md: MarkdownIt, options?: Record<string, unknown>) => void
  export default attrs
}
