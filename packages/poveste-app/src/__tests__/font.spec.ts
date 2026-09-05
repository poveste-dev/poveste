import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain script, no types
import { FONT_PACKAGE, generateFontCss, referencedFiles } from '../../scripts/font.mjs'

// Vitest runs from the package root, and stubs `?raw` CSS imports to empty.
// Newlines are normalised: the shipped sheet is checked in, so a Windows
// checkout hands it back with CRLF, and this compares content against the
// LF-newline installed package, not line endings (#156).
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n')

const shipped = read('src/app/style/font.css')
const upstream = read(join('node_modules', FONT_PACKAGE, 'index.css'))

describe('the vendored files', () => {
  // The sheet and the files are one artifact now that the package is a
  // devDependency: a book asking for a face that is not on disk renders the
  // fallback, and nothing else would say so (#306).
  it('ships every file the sheet asks for', () => {
    const missing = referencedFiles(shipped).filter(file => !existsSync(join(process.cwd(), 'src/app/style/fonts', file)))

    expect(missing).toEqual([])
  })

  // The other direction: a subset upstream drops or renames leaves a file the
  // sheet no longer names, and `files: ['dist', 'src']` would publish it.
  it('ships nothing the sheet does not ask for', () => {
    const named = new Set([...referencedFiles(shipped), 'LICENSE'])
    const orphans = readdirSync(join(process.cwd(), 'src/app/style/fonts')).filter(file => !named.has(file))

    expect(orphans).toEqual([])
  })

  it('asks for at least one, so a sheet that references nothing is not a pass', () => {
    expect(referencedFiles(shipped).length).toBeGreaterThan(0)
  })

  // SIL OFL requires the notice to travel with the font.
  it('carries the licence the font is under', () => {
    expect(read('src/app/style/fonts/LICENSE')).toContain('SIL Open Font License')
  })

  // Vendoring froze these bytes. A Fontsource patch that fixes hinting or adds
  // a glyph keeps the filenames and unicode-ranges, so the sheet comparison
  // below stays green while the files it names are stale — the property that
  // installing the package used to provide for free.
  it('matches upstream byte for byte, since a bump no longer ships itself', () => {
    const stale = referencedFiles(shipped).filter(file => !readFileSync(join(process.cwd(), 'src/app/style/fonts', file))
      .equals(readFileSync(join(process.cwd(), 'node_modules', FONT_PACKAGE, 'files', file))))

    expect(stale).toEqual([])
  })

  // `read`, not `readFileSync`: the licence is checked in, so a Windows
  // checkout hands it back with CRLF against the LF of the installed copy.
  it('carries upstream\'s own licence text, not a copy that has drifted', () => {
    expect(read('src/app/style/fonts/LICENSE')).toBe(read(join('node_modules', FONT_PACKAGE, 'LICENSE')))
  })
})

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
