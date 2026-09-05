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
 * `shiki/core` rather than `shiki`, and every grammar and theme named.
 *
 * `createHighlighter` is Shiki's full-bundle entry: importing it statically
 * pulls in every grammar and every theme whatever the options ask for, so every
 * book shipped COBOL and Wolfram in a 10 MB chunk to highlight two languages
 * (#304). This form ships what is listed and nothing else.
 *
 * The imports are dynamic on purpose — that is the interface, and it is what
 * lets the bundler see each grammar as its own module rather than as a member
 * of one barrel.
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
