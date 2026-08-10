import type { Highlighter } from 'shiki'
import { createHighlighter } from 'shiki'

/**
 * Shiki is meant to be used as a singleton: each instance carries its own WASM
 * engine and grammar set. The source pane unmounts and remounts on every story
 * navigation, so creating one per mount grows memory for the lifetime of the
 * tab — and trips Shiki's own warning once ten are live.
 *
 * The langs and themes are fixed, so one shared instance is always correct.
 */
let highlighterPromise: Promise<Highlighter> | undefined

export function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    langs: [
      'html',
      'jsx',
    ],
    themes: [
      'github-light',
      'github-dark',
    ],
  }).catch((e) => {
    // Don't let a cached rejection disable highlighting for the rest of the
    // session — drop it so the next mount can try again.
    highlighterPromise = undefined
    throw e
  })

  return highlighterPromise
}
