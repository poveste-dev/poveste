import type { HighlighterCore, ThemeRegistrationRaw } from 'shiki/core'
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
/**
 * github-light paints `entity.name.tag` — every tag name the source pane
 * renders — in `#22863a`, which is 4.43:1 on the pane's background. AA wants
 * 4.5, so it misses by 1.6% (#533). `#1f7a34` is 5.17:1 and changes nothing
 * else about how code reads.
 *
 * Patched rather than swapped: choosing another theme restyles every code block
 * in every book to fix one token. The same colour appears on three other scopes
 * the pane can reach, so all four move together.
 *
 * If a shiki upgrade restructures the theme this quietly stops applying, and
 * the guard for that is `color-contrast` in `e2e/axe-chrome.spec.ts` — which is
 * enabled precisely so this cannot revert unnoticed.
 */
async function accessibleGithubLight(): Promise<ThemeRegistrationRaw> {
  const theme = (await import('shiki/themes/github-light.mjs')).default as ThemeRegistrationRaw & {
    tokenColors?: { settings?: { foreground?: string } }[]
  }

  return {
    ...theme,
    tokenColors: theme.tokenColors?.map(token =>
      token.settings?.foreground?.toLowerCase() === '#22863a'
        ? { ...token, settings: { ...token.settings, foreground: '#1f7a34' } }
        : token),
  } as ThemeRegistrationRaw
}

export function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    langs: [
      import('shiki/langs/html.mjs'),
      import('shiki/langs/jsx.mjs'),
    ],
    themes: [
      accessibleGithubLight(),
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
