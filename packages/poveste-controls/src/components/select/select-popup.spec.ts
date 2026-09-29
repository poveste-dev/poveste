import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * The options popper is portalled to `body`, so it is outside the panel whose
 * colour the trigger inherits, and `body` carries none. Setting a background and
 * leaving the text to inheritance therefore left the options at the UA default —
 * black on the dark panel, which is what shipped.
 *
 * A surface that moves out of its subtree has to state both.
 */
const source = readFileSync(resolve(__dirname, 'CustomSelect.vue'), 'utf8')

/** The declarations of the first rule whose selector matches, brace to brace. */
function rule(selector: string) {
  const start = source.indexOf(selector)
  if (start === -1) {
    return ''
  }
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') {
      depth++
    }
    if (source[i] === '}') {
      depth--
      if (depth === 0) {
        return source.slice(open + 1, i)
      }
    }
  }
  return ''
}

describe('the select options popper', () => {
  const options = rule('.poveste-select-options')

  // `\bcolor:` would also match `border-color:`, which both blocks already have.
  const textColour = /(?:^|[;{])\s*color:/m

  it('states a text colour beside its background', () => {
    expect(options).toMatch(textColour)
  })

  it('states one for dark too, where the default is furthest from readable', () => {
    expect(options.slice(options.indexOf('.ptw-dark'))).toMatch(textColour)
  })
})
