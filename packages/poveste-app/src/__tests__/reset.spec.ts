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
const source = readFileSync(resolve(__dirname, '../app/style/main.pcss'), 'utf8')

/** The declarations inside the first rule whose selector list matches. */
function rule(selector: string) {
  const start = source.indexOf(selector)
  if (start === -1) {
    return null
  }
  const open = source.indexOf('{', start)
  return source.slice(open + 1, source.indexOf('}', open))
}

describe('the manual Preflight replacement', () => {
  it('clears the UA background off a button', () => {
    expect(rule('button,\n  [type=\'button\']')).toContain('background-color: transparent')
  })

  it('clears the UA background image too', () => {
    // Preflight resets both; a gradient theme would otherwise come back.
    expect(rule('button,\n  [type=\'button\']')).toContain('background-image: none')
  })

  it('stays inside `@layer base`, where a utility can still win', () => {
    // An unlayered rule beats every layered one, so `bg-*` on a button would stop
    // working — the trap the file's own comment records.
    const layers = [...source.matchAll(/@layer base \{/g)].map(match => match.index)
    const button = source.indexOf('background-color: transparent')
    expect(layers.some(start => start < button)).toBe(true)
  })
})
