import { describe, expect, it } from 'vitest'
import { resolvedTheme } from '../virtual/resolved-theme.js'

/**
 * The producer half of the chrome's colours: this emits the variables that
 * `packages/poveste-controls/src/style/tokens.css` bridges to, and
 * `scripts/checks/theme-tokens.ts` holds the two to the same spelling. It had no
 * test of its own (#955).
 */
function themed(colors: unknown): string {
  return resolvedTheme({ config: { theme: { colors } } } as never)
}

describe('resolvedTheme', () => {
  it('emits the colour the config wrote, which is what the token reads', () => {
    expect(themed({ primary: { 500: '#10b981' } })).toBe('*, ::before, ::after {--_poveste-color-primary-500: #10b981;}')
  })

  // Every shade of both themable names, since `defu` fills what a partial
  // override leaves out — a book always resolves the whole palette.
  it('emits every shade it is given, under its own name', () => {
    const css = themed({ primary: { 50: '#ecfdf5', 900: '#064e3b' }, gray: { 850: '#1f1f21' } })

    expect(css).toContain('--_poveste-color-primary-50: #ecfdf5;')
    expect(css).toContain('--_poveste-color-primary-900: #064e3b;')
    expect(css).toContain('--_poveste-color-gray-850: #1f1f21;')
  })

  /*
   * `#0f0` is the case that found the shorthand expansion had never run:
   * `([a-f\d]){3,4}` captures one character, not three, so every shorthand a
   * config used came back unreadable and threw below (#955).
   */
  it('accepts every spelling `parseColor` accepts, and passes it through', () => {
    expect(themed({ primary: { 500: '#0f0' } })).toContain('--_poveste-color-primary-500: #0f0;')
    expect(themed({ primary: { 500: 'rgb(16 185 129)' } })).toContain('--_poveste-color-primary-500: rgb(16 185 129);')
  })

  /*
   * The two a rebuild from `parseColor`'s parts used to lose. Channels dropped
   * the alpha, so `transparent` came out as opaque black; and they carried no
   * colour space, so an `hsl()` was emitted as three numbers and wrapped in
   * `rgb()`, which is not a colour — the declaration went in the bin and the
   * token fell back to its default (#955).
   */
  it('keeps an alpha, and keeps the space a colour was written in', () => {
    expect(themed({ primary: { 500: '#10b98180' } })).toContain('--_poveste-color-primary-500: #10b98180;')
    expect(themed({ primary: { 500: 'transparent' } })).toContain('--_poveste-color-primary-500: transparent;')
    expect(themed({ primary: { 500: 'hsl(160 84% 39%)' } })).toContain('--_poveste-color-primary-500: hsl(160 84% 39%);')
  })

  /*
   * Named rather than dropped. A colour this cannot parse would otherwise emit
   * an empty declaration, and `rgb(var(--x, …))` then silently falls back to the
   * default — a configured colour that does nothing, with nothing said about it.
   */
  it('names the colour it cannot read, rather than emitting nothing for it', () => {
    expect(() => themed({ primary: { 500: 'not-a-colour' } }))
      .toThrowError('[poveste] theme.colors.primary.500 is not a colour poveste can read: "not-a-colour"')
  })

  it('emits an empty rule when nothing is themed', () => {
    expect(themed(undefined)).toBe('*, ::before, ::after {}')
  })
})
