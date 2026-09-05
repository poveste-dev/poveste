import type { HighlighterCore } from 'shiki/core'
import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'

/**
 * Shiki is meant to be used as a singleton: each instance carries its own WASM
 * engine and grammar set. The source pane unmounts and remounts on every story
 * navigation, so creating one per mount grows memory for the lifetime of the
 * tab — and trips Shiki's own warning once ten are live.
 *
 * The langs and themes are fixed, so one shared instance is always correct.
 */
let highlighterPromise: Promise<HighlighterCore> | undefined

/**
 * `shiki/core`, not `shiki`: the latter is the full-bundle entry and ships every
 * grammar and theme whatever the options ask for — 10 MB a book (#304). The
 * dynamic imports are the interface, not a lazy-loading choice.
 */
export function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    langs: [
      import('shiki/langs/html.mjs'),
      import('shiki/langs/jsx.mjs'),
    ],
    themes: [
      import('shiki/themes/github-light.mjs'),
      import('shiki/themes/github-dark.mjs'),
    ],
    engine: createOnigurumaEngine(import('shiki/wasm')),
  }).catch((e) => {
    // Don't let a cached rejection disable highlighting for the rest of the
    // session — drop it so the next mount can try again.
    highlighterPromise = undefined
    throw e
  })

  return highlighterPromise
}
