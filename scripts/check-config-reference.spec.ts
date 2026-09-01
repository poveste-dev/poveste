import { describe, expect, it } from 'vitest'
import { configKeys, documentedKeys, staleEntries, undocumentedKeys } from './check-config-reference.ts'

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
