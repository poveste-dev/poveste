import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasDesignSystemLoader, isTailwindEntry, resolveDesignSystemLoader, TAILWIND_V4_REQUIRED } from './index.js'

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

// The plugin calls `__unstable__loadDesignSystem`, whose name is Tailwind's own
// warning that it can vanish. The peer range bounds it; this decides whether the
// failure names the version mismatch or blames Poveste (#320).
describe('hasDesignSystemLoader', () => {
  it('accepts the tailwindcss v4 module actually installed here', async () => {
    expect(hasDesignSystemLoader(await import('tailwindcss'))).toBe(true)
  })

  it('rejects a Tailwind that does not export it, as v3 does not', () => {
    expect(hasDesignSystemLoader({ compile: () => {}, default: {} })).toBe(false)
  })

  it('rejects an export that is present but not callable', () => {
    expect(hasDesignSystemLoader({ __unstable__loadDesignSystem: 'nope' })).toBe(false)
  })

  it('rejects nothing at all rather than throwing on it', () => {
    expect(hasDesignSystemLoader(undefined)).toBe(false)
    expect(hasDesignSystemLoader(null)).toBe(false)
  })

  it('names the version to install, not the missing symbol alone', () => {
    expect(TAILWIND_V4_REQUIRED).toContain('tailwindcss@^4')
    expect(TAILWIND_V4_REQUIRED).toContain('@poveste/plugin-tailwind')
  })
})

describe('resolveDesignSystemLoader', () => {
  it('returns the loader from the real tailwindcss', async () => {
    expect(typeof await resolveDesignSystemLoader()).toBe('function')
  })

  it('names the version mismatch instead of failing on an undefined call', async () => {
    const v3Like = { compile: () => {}, default: {} }

    await expect(resolveDesignSystemLoader(async () => v3Like)).rejects.toThrow(/needs Tailwind v4/)
  })

  it('throws before anything tries to call the missing export', async () => {
    await expect(resolveDesignSystemLoader(async () => ({}))).rejects.not.toThrow(/is not a function/)
  })
})
