// markdown-it-emoji ships no types, and `@types/markdown-it-emoji` is written against
// `@types/markdown-it` 14, whose MarkdownIt a markdown-it 15 instance does not satisfy.
declare module 'markdown-it-emoji' {
  import type { MarkdownIt } from 'markdown-it'

  export const full: (md: MarkdownIt, options?: Record<string, unknown>) => void
}
