import { describe, expect, it } from 'vitest'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { bridges, checkThemeTokens, defaultPalettes, IMPORTERS, importProblems, palette, tokenProblems } from './theme-tokens.ts'

const COLORS = `
export const defaultColors = {
  emerald: {
    500: '#10b981',
    900: '#064e3b',
  },
  zinc: {
    500: '#71717a',
  },
}
`

const CONFIG = `
    theme: {
      title: 'Poveste',
      colors: {
        primary: defaultColors.emerald,
        gray: defaultColors.zinc,
      },
    },
`

const TOKENS = `
@theme {
  --color-primary-500: var(--_poveste-color-primary-500, #10b981);
  --color-primary-900: var(--_poveste-color-primary-900, #064e3b);
  --color-gray-500: var(--_poveste-color-gray-500, #71717a);
}
`

describe('importProblems', () => {
  it('passes a stylesheet that reads the tokens', () => {
    expect(importProblems('a.css', '@import \'tailwindcss/utilities.css\';\n@import \'./tokens.css\';\n')).toEqual([])
  })

  it('passes one that reaches them by the relative path the app uses', () => {
    expect(importProblems('a.pcss', '@import \'../../../../poveste-controls/src/style/tokens.css\';\n')).toEqual([])
  })

  // The half the builds do not catch: `@poveste/app` compiles clean without it.
  it('reports one that does not, since only one of the two builds would', () => {
    expect(importProblems('a.pcss', '@import \'tailwindcss/utilities.css\';\n')).toEqual([
      'a.pcss does not import packages/poveste-controls/src/style/tokens.css, so nothing defines the chrome\'s colours in its build — and only one of the two builds fails when that happens',
    ])
  })

  it('names both stylesheets that have to read them', () => {
    expect(IMPORTERS).toEqual([
      'packages/poveste-controls/src/style/main.css',
      'packages/poveste-app/src/app/style/main.pcss',
    ])
  })
})

describe('defaultPalettes', () => {
  it('reads the pairing off the config rather than repeating it', () => {
    expect(defaultPalettes(CONFIG)).toEqual({ primary: 'emerald', gray: 'zinc' })
  })

  it('finds none in a config that names no colours', () => {
    expect(defaultPalettes('export const nothing = 1\n')).toEqual({})
  })
})

describe('palette', () => {
  it('reads a palette\'s shades', () => {
    expect(palette(COLORS, 'emerald')).toEqual({ 500: '#10b981', 900: '#064e3b' })
  })

  // Shorthand is a colour a config may legally write, so a palette using one
  // has to be visible here — otherwise the token reading it is reported as
  // bridging to something nothing supplies, which sends the reader to the
  // wrong file.
  it('reads the shorthand and eight-digit forms as well as the plain six', () => {
    const short = COLORS.replace('\'#10b981\'', '\'#0f0\'').replace('\'#064e3b\'', '\'#10b98180\'')

    expect(palette(short, 'emerald')).toEqual({ 500: '#0f0', 900: '#10b98180' })
  })
})

describe('bridges', () => {
  it('reads the token, the shade and the fallback', () => {
    expect(bridges(TOKENS)).toEqual([
      { name: 'primary', key: '500', fallback: '#10b981' },
      { name: 'primary', key: '900', fallback: '#064e3b' },
      { name: 'gray', key: '500', fallback: '#71717a' },
    ])
  })

  // The shape this file exists to reject: a token that names a colour rather
  // than following the book's.
  it('does not count a token that never reaches the bridge', () => {
    expect(bridges('--color-primary-500: var(--color-emerald-500);')).toEqual([])
  })

  it('reads a fallback that is not a hex, since a config may write any colour', () => {
    expect(bridges('--color-primary-500: var(--_poveste-color-primary-500, hsl(160 84% 39%));'))
      .toEqual([{ name: 'primary', key: '500', fallback: 'hsl(160 84% 39%)' }])
  })
})

describe('tokenProblems', () => {
  it('passes when every default shade is bridged at its own value', () => {
    expect(tokenProblems(TOKENS, COLORS, CONFIG)).toEqual([])
  })

  it('reports a shade the config resolves that no token reads', () => {
    const missing = TOKENS.replace(/ {2}--color-primary-900.*\n/, '')

    expect(tokenProblems(missing, COLORS, CONFIG)).toEqual([
      '`theme.colors.primary.900` is resolved per book and no token reads it — add --color-primary-900 to packages/poveste-controls/src/style/tokens.css',
    ])
  })

  it('reports a token bridging to a variable no configuration supplies', () => {
    const extra = TOKENS.replace('}', '  --color-primary-950: var(--_poveste-color-primary-950, #022c22);\n}')

    expect(tokenProblems(extra, COLORS, CONFIG)).toEqual([
      '--color-primary-950 bridges to `--_poveste-color-primary-950`, which no configuration supplies — it can only ever be its fallback',
    ])
  })

  it('reports a fallback that is not the value the config would have supplied', () => {
    const drifted = TOKENS.replace('#10b981', '#00b87f')

    expect(tokenProblems(drifted, COLORS, CONFIG)).toEqual([
      '--color-primary-500 falls back to `#00b87f` where `defaultColors.emerald.500` is `#10b981`',
    ])
  })

  // Invalid rather than wrong: `rgb(var(--x))` with nothing injected drops the
  // declaration, so the element renders with no colour at all.
  it('reports a bridge with no fallback', () => {
    const bare = TOKENS.replace(', #10b981', '')

    expect(tokenProblems(bare, COLORS, CONFIG)).toEqual([
      '--color-primary-500 has no fallback, so it is nothing at all wherever the book does not inject one — expected `#10b981`',
    ])
  })

  it('reports a config it cannot read the pairing from, rather than checking nothing', () => {
    expect(tokenProblems(TOKENS, COLORS, 'export const nothing = 1\n')).toEqual([
      'could not read which palettes `theme.colors` defaults to from packages/poveste/src/node/config.ts',
    ])
  })

  it('reports a tokens file that bridges nothing, rather than passing it', () => {
    expect(tokenProblems('@theme {}\n', COLORS, CONFIG)).toEqual([
      'packages/poveste-controls/src/style/tokens.css bridges no token to `--_poveste-color-*`',
    ])
  })
})

describe('checkThemeTokens', () => {
  it('every themable colour a book resolves is read by a token, at the value the config defaults to', { tags: ['check', 'app'] }, () => {
    assertNoProblems(checkThemeTokens())
  })
})
