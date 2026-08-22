import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isTailwindEntry } from './index.js'

function cssFile(contents: string) {
  const dir = mkdtempSync(join(tmpdir(), 'poveste-tw-'))
  const file = join(dir, 'entry.css')
  writeFileSync(file, contents)
  return file
}

describe('isTailwindEntry', () => {
  it('accepts a Tailwind import', () => {
    expect(isTailwindEntry(cssFile(`@import 'tailwindcss';`))).toBe(true)
    expect(isTailwindEntry(cssFile(`@import "tailwindcss";`))).toBe(true)
    expect(isTailwindEntry(cssFile(`@import 'tailwindcss/theme' layer(theme);`))).toBe(true)
  })

  it('accepts a theme block', () => {
    expect(isTailwindEntry(cssFile('@theme {\n  --color-brand: red;\n}'))).toBe(true)
  })

  it('rejects a stylesheet that merely imports something', () => {
    // The case this exists for. `examples/sveltekit` has no Tailwind at all, and
    // its `src/app.css` opens with a font import — enough to satisfy any test
    // looser than this one, and it was getting a Design System group and a
    // Tailwind story rendering Tailwind's own defaults.
    expect(isTailwindEntry(cssFile(`@import '@fontsource/fira-mono';\n\n:root { --pure-white: #fff }`))).toBe(false)
  })

  it('rejects a name that only looks like Tailwind', () => {
    expect(isTailwindEntry(cssFile('.tailwindcss { color: red }'))).toBe(false)
    expect(isTailwindEntry(cssFile('/* @import tailwindcss was here */'))).toBe(false)
  })

  it('rejects a file it cannot read', () => {
    expect(isTailwindEntry(join(tmpdir(), 'poveste-tw-does-not-exist.css'))).toBe(false)
  })
})
