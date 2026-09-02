import { describe, expect, it } from 'vitest'
import { codeOnly, configKeys, documentedKeys, parseConfig, staleEntries, undocumentedKeys } from './check-config-reference.ts'

const SOURCE = `
export interface PovesteConfig {
  /**
   * Plugins.
   */
  plugins?: Plugin[]
  outDir?: string
  theme?: {
    title?: string
    colors?: Record<string, string>
  }
  responsivePresets?: ResponsivePreset[]
  build?: {
    excludeFromVendorsChunk?: (string | RegExp)[]
  }
}

export type ConfigMode = 'build' | 'dev'
`

const REFERENCE = `
# Configuration Reference

## \`plugins\`

\`Plugin[]\`

## \`outDir\`

\`string\`

## \`theme\`

\`Object\`

## \`responsivePresets\`

\`ResponsivePreset[]\`

## \`build\`

\`Object\`

### \`build.excludeFromVendorsChunk\`

\`(string | RegExp)[]\`
`

describe('configKeys', () => {
  it('reads the top-level keys in declaration order', () => {
    expect(configKeys(SOURCE)).toEqual(['plugins', 'outDir', 'theme', 'responsivePresets', 'build'])
  })

  // `theme` and `build` are inline object literals; their own keys are not
  // top-level config and must not be demanded of the reference.
  it('does not descend into a nested object literal', () => {
    expect(configKeys(SOURCE)).not.toContain('title')
    expect(configKeys(SOURCE)).not.toContain('excludeFromVendorsChunk')
  })

  it('stops at the end of the interface', () => {
    expect(configKeys(SOURCE)).not.toContain('ConfigMode')
  })

  it('fails loudly if the interface is renamed out from under it', () => {
    expect(() => configKeys('export interface SomethingElse {\n  a?: string\n}'))
      .toThrow(/could not find `export interface PovesteConfig`/)
  })
})

describe('documentedKeys', () => {
  it('reads the top-level headings and not the sub-key ones', () => {
    expect(documentedKeys(REFERENCE)).toEqual(['plugins', 'outDir', 'theme', 'responsivePresets', 'build'])
  })
})

describe('undocumentedKeys', () => {
  it('is silent when the reference covers every key', () => {
    expect(undocumentedKeys(SOURCE, REFERENCE)).toEqual([])
  })

  // The state this exists to prevent: a key added to the type and nowhere else.
  it('names a key added to the type with no reference entry', () => {
    const source = SOURCE.replace('  build?: {', '  collectMaxThreads?: number\n  build?: {')

    expect(undocumentedKeys(source, REFERENCE)).toEqual(['collectMaxThreads'])
  })

  it('names every missing key, so one run says what to write', () => {
    expect(undocumentedKeys(SOURCE, '# Configuration Reference\n')).toEqual([
      'plugins',
      'outDir',
      'theme',
      'responsivePresets',
      'build',
    ])
  })
})

describe('staleEntries', () => {
  it('is silent when every entry is still a key', () => {
    expect(staleEntries(SOURCE, REFERENCE)).toEqual([])
  })

  // A rename leaves both a missing key and an orphaned entry; reporting only
  // the first would have the entry edited in place and the old one left behind.
  it('names an entry whose key no longer exists', () => {
    const source = SOURCE.replace('outDir?: string', 'outputDir?: string')

    expect(undocumentedKeys(source, REFERENCE)).toEqual(['outputDir'])
    expect(staleEntries(source, REFERENCE)).toEqual(['outDir'])
  })

  it('does not mistake a documented sub-key for a stale entry', () => {
    expect(staleEntries(SOURCE, REFERENCE)).not.toContain('build.excludeFromVendorsChunk')
  })
})

describe('codeOnly', () => {
  // The defect this exists for: one unbalanced brace in a JSDoc desynchronised
  // depth counting, and a key added after it went unreported — the check
  // reported success while the thing it guards was broken.
  it('blanks a brace inside a block comment', () => {
    expect(codeOnly('/** Use `{` here */\na?: string')).toBe('                   \na?: string')
  })

  it('blanks a brace inside a line comment', () => {
    expect(codeOnly('// a { here\nb?: string')).toBe('           \nb?: string')
  })

  it('blanks a brace inside a string literal', () => {
    expect(codeOnly(`a?: '{'`)).toBe(`a?: ' '`)
  })

  it('keeps line structure, so key positions are unchanged', () => {
    const source = '/**\n * one\n */\na?: string'

    expect(codeOnly(source).split('\n')).toHaveLength(4)
  })

  it('leaves real code alone', () => {
    expect(codeOnly('theme?: {\n  title?: string\n}')).toBe('theme?: {\n  title?: string\n}')
  })
})

describe('parseConfig', () => {
  const withComment = SOURCE.replace('  build?: {', '  /** Globs use `{` for expansion. */\n  build?: {')

  it('is not thrown off by a brace in a comment', () => {
    expect(parseConfig(withComment).keys).toEqual(configKeys(SOURCE))
  })

  it('reads the fields of an inline object literal', () => {
    expect(parseConfig(SOURCE).nested.get('build')).toEqual(['excludeFromVendorsChunk'])
    expect(parseConfig(SOURCE).nested.get('theme')).toEqual(['title', 'colors'])
  })

  // Parentheses were untracked, so a parameter on its own line sat at depth 0
  // and was reported as a config key.
  it('does not mistake a function-type parameter for a key', () => {
    const source = `
export interface PovesteConfig {
  markdown?: (
    md: MarkdownIt,
  ) => MarkdownIt
  outDir?: string
}
`
    expect(parseConfig(source).keys).toEqual(['markdown', 'outDir'])
  })

  it('refuses to report a partial answer when the delimiters do not balance', () => {
    const source = 'export interface PovesteConfig {\n  a?: { b: 1\n  c?: string\n}'

    expect(() => parseConfig(source)).toThrow(/unbalanced delimiters/)
  })
})

describe('staleEntries, for a documented sub-key', () => {
  // Sub-key headings were skipped entirely, so the reference could go on
  // describing an option the build had stopped reading.
  it('names one whose field no longer exists', () => {
    const source = SOURCE.replace('excludeFromVendorsChunk?:', 'excludeFromVendors?:')

    expect(staleEntries(source, REFERENCE)).toEqual(['build.excludeFromVendorsChunk'])
  })

  it('names one whose parent key no longer exists', () => {
    const source = SOURCE.replace('  build?: {', '  bundle?: {')

    expect(staleEntries(source, REFERENCE)).toEqual(['build', 'build.excludeFromVendorsChunk'])
  })

  it('is silent while the field is still there', () => {
    expect(staleEntries(SOURCE, REFERENCE)).toEqual([])
  })
})
