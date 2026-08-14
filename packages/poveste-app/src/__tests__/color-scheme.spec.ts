import { beforeEach, describe, expect, it, vi } from 'vitest'

// `util/config` re-exports a virtual module Vite generates from the book's
// config, so the tests supply it directly.
const config: { theme: { darkClass?: string }, sandboxDarkClass?: string } = { theme: {} }

vi.mock('../app/util/config', () => ({
  get povesteConfig() {
    return config
  },
}))

// Pulls in browser storage on import; unrelated to the pure function here.
vi.mock('../app/util/dark', () => ({ isDark: { value: false } }))

const { previewDarkClasses } = await import('../app/util/color-scheme')

describe('previewDarkClasses', () => {
  beforeEach(() => {
    config.theme = { darkClass: 'dark' }
    config.sandboxDarkClass = undefined
  })

  it('returns the theme class alone for a book on defaults', () => {
    expect(previewDarkClasses()).toEqual(['dark'])
  })

  it('returns the theme class alone when only it is configured', () => {
    config.theme = { darkClass: 'my-dark' }

    // #126: the deprecated option used to default to `dark` and be emitted
    // here too, which is what made the three render paths disagree.
    expect(previewDarkClasses()).toEqual(['my-dark'])
  })

  it('adds an explicitly configured sandboxDarkClass', () => {
    config.theme = { darkClass: 'my-dark' }
    config.sandboxDarkClass = 'legacy'

    expect(previewDarkClasses()).toEqual(['my-dark', 'legacy'])
  })

  it('does not repeat a sandboxDarkClass that matches the theme class', () => {
    config.sandboxDarkClass = 'dark'

    expect(previewDarkClasses()).toEqual(['dark'])
  })

  // `classList.toggle('')` throws, and the sandbox runs it during boot, so an
  // empty entry would leave every preview blank rather than merely unstyled.
  it.each([
    ['an empty theme class', { darkClass: '' }, undefined, []],
    ['an empty sandbox class', { darkClass: 'dark' }, '', ['dark']],
    ['an undefined theme class', {}, 'legacy', ['legacy']],
  ])('drops %s', (_name, theme, legacy, expected) => {
    config.theme = theme
    config.sandboxDarkClass = legacy

    expect(previewDarkClasses()).toEqual(expected)
  })
})
