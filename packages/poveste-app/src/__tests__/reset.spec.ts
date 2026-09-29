import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Preflight is deliberately off and `main.pcss` replaces it by hand, so anything
 * the replacement leaves out is a UA default the chrome then renders. The one
 * that shipped was the button background: `ButtonFace` reads as a light grey
 * panel, close enough to the light chrome to pass review and a white hole in dark.
 *
 * Asserted against the source rather than the built sheet because the build is
 * postcss over this file, and a reader looking for the reset looks here.
 */
// `__dirname` rather than `import.meta.url`, which vitest's transform does not
// leave intact here — the same trap `icons.spec.ts` records.
//
// Line endings normalised, and the anchor below is a single line: matching a
// selector list *across* its own line break reads the file as the checkout wrote
// it, which on Windows is CRLF. This found nothing there and passed everywhere
// else, which is the worst way for a check to be wrong.
const source = readFileSync(resolve(__dirname, '../app/style/main.pcss'), 'utf8').replace(/\r\n/g, '\n')

/** The declarations of the first rule whose selector list contains `anchor`. */
function rule(anchor: string) {
  const start = source.indexOf(anchor)
  if (start === -1) {
    return null
  }
  const open = source.indexOf('{', start)
  return source.slice(open + 1, source.indexOf('}', open))
}

/** The last line of the button reset's selector list. */
const BUTTON_RESET = '[type=\'submit\']'

describe('the manual Preflight replacement', () => {
  it('clears the UA background off a button', () => {
    expect(rule(BUTTON_RESET)).toContain('background-color: transparent')
  })

  it('clears the UA background image too', () => {
    // Preflight resets both; a gradient theme would otherwise come back.
    expect(rule(BUTTON_RESET)).toContain('background-image: none')
  })

  it('stays inside `@layer base`, where a utility can still win', () => {
    // An unlayered rule beats every layered one, so `bg-*` on a button would stop
    // working — the trap the file's own comment records.
    const layers = [...source.matchAll(/@layer base \{/g)].map(match => match.index)
    const button = source.indexOf('background-color: transparent')
    expect(layers.some(start => start < button)).toBe(true)
  })
})
