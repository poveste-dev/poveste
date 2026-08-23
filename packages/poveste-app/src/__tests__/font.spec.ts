import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain script, no types
import { FONT_PACKAGE, generateFontCss } from '../../scripts/font.mjs'

// Vitest runs from the package root, and stubs `?raw` CSS imports to empty.
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

const shipped = read('src/app/style/font.css')
const upstream = read(join('node_modules', FONT_PACKAGE, 'index.css'))

describe('the bundled app face', () => {
  it('matches the installed package, so a bump cannot go unnoticed', () => {
    expect(shipped).toBe(generateFontCss(upstream))
  })

  it('asks for no format the woff2 already covers', () => {
    expect(shipped).not.toContain('format(\'woff\')')
  })

  it('keeps every subset upstream ships, so non-latin text stays on the face', () => {
    const subsets = (css: string) => (css.match(/unicode-range: [^;]+/g) ?? []).sort()

    expect(subsets(shipped)).toEqual(subsets(upstream))
  })
})
