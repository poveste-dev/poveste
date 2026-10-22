import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// `private-tokens.css` mirrors `tokens.css` under the names a control reads (#1443).
// A colour added to one and not the other is a control styled in the chrome and
// unstyled in a sandboxed story, so the two are held together here.
const read = (file: string) => readFileSync(join(import.meta.dirname, file), 'utf8')

function declarations(css: string, prefix: RegExp): Map<string, string> {
  return new Map([...css.matchAll(/--([\w-]+):\s*([^\s;][^;]*);/g)]
    .filter(([, name]) => prefix.test(name!))
    .map(([, name, value]) => [name!, value!.trim()]))
}

describe('the controls\' own tokens', () => {
  const theme = declarations(read('tokens.css').slice(read('tokens.css').indexOf('@theme')), /^(?:color|radius)/)
  const own = declarations(read('private-tokens.css'), /^_poveste-/)

  it('carry every colour and radius the chrome\'s tokens define, with the same value', () => {
    const expected = [...theme].map(([name, value]) => [`_poveste-${name.replace(/^color-/, '')}`, value])

    expect(expected.filter(([name, value]) => own.get(name!) !== value)).toEqual([])
  })
})
