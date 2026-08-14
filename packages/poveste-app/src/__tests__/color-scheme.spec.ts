import { describe, expect, it, vi } from 'vitest'

// `util/config` re-exports a virtual module Vite generates from the book's own
// config, so the tests supply it directly.
const config: { theme: { darkClass?: string }, sandboxDarkClass?: string } = { theme: {} }

vi.mock('../app/util/config', () => ({
  get povesteConfig() {
    return config
  },
}))

// Touches browser storage on import; unrelated to the pure function under test.
vi.mock('../app/util/dark', () => ({ isDark: { value: false } }))

const { previewDarkClasses } = await import('../app/util/color-scheme')

function darkClassesFor({ darkClass = 'dark', sandboxDarkClass }: { darkClass?: string, sandboxDarkClass?: string }) {
  config.theme = { darkClass }
  config.sandboxDarkClass = sandboxDarkClass
  return previewDarkClasses()
}

describe('previewDarkClasses', () => {
  it('returns the theme class for a book that configures neither', () => {
    expect(darkClassesFor({})).toEqual(['dark'])
  })

  // #126: the deprecated option used to default to `dark` and be emitted here
  // too, which is what made the three render paths disagree.
  it('returns the theme class alone when only it is configured', () => {
    expect(darkClassesFor({ darkClass: 'my-dark' })).toEqual(['my-dark'])
  })

  it('appends sandboxDarkClass when a book still sets it', () => {
    expect(darkClassesFor({ darkClass: 'my-dark', sandboxDarkClass: 'legacy' })).toEqual(['my-dark', 'legacy'])
  })

  it('returns one class when both names are the same', () => {
    expect(darkClassesFor({ darkClass: 'dark', sandboxDarkClass: 'dark' })).toEqual(['dark'])
  })

  // `classList.toggle('')` throws, and the sandbox runs it during boot, so an
  // empty entry leaves every preview blank rather than merely unstyled. Only
  // the empty string reaches here — defu fills an undefined class.
  describe('when a configured class name is empty', () => {
    it('drops an empty theme class', () => {
      expect(darkClassesFor({ darkClass: '' })).toEqual([])
    })

    it('drops an empty sandboxDarkClass', () => {
      expect(darkClassesFor({ sandboxDarkClass: '' })).toEqual(['dark'])
    })
  })
})
