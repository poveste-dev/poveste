import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDefaultConfig, mergeConfig, resolveConfigFile } from '../config.js'

// `mergeConfig(user, defaults)`: defu-style, the first argument wins.
describe('mergeConfig', () => {
  it('adds user storyIgnored patterns to the defaults instead of replacing them', () => {
    const merged = mergeConfig({ storyIgnored: ['**/fixtures/**'] }, getDefaultConfig())

    expect(merged.storyIgnored).toEqual(expect.arrayContaining(['**/node_modules/**', '**/dist/**', '**/fixtures/**']))
  })

  it('does not duplicate a default a user spelled out again', () => {
    const merged = mergeConfig({ storyIgnored: ['**/node_modules/**', '**/fixtures/**'] }, getDefaultConfig())

    expect(merged.storyIgnored.filter(p => p === '**/node_modules/**')).toHaveLength(1)
  })

  // Narrowing the match is a real use — `src/**/*.story.vue` to skip binary
  // folders — so the replace rule is the right one there.
  it('still lets a user narrow storyMatch', () => {
    const merged = mergeConfig({ storyMatch: ['src/**/*.story.vue'] }, getDefaultConfig())

    expect(merged.storyMatch).toEqual(['src/**/*.story.vue'])
  })
})

// `resolveConfigFile` is the whole of the drop-in promise the migration guide
// makes twice: an existing `histoire.config.ts` keeps working, and a
// `poveste.config.ts` beside it wins. Nothing exercised either before #336.
describe('resolveConfigFile', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'poveste-config-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  function write(...names: string[]): void {
    for (const name of names) {
      writeFileSync(join(dir, name), 'export default {}')
    }
  }

  it('finds the canonical config file', () => {
    write('poveste.config.ts')

    expect(resolveConfigFile(dir)).toBe(join(dir, 'poveste.config.ts'))
  })

  it('falls back to a histoire config when it is the only one', () => {
    write('histoire.config.ts')

    expect(resolveConfigFile(dir)).toBe(join(dir, 'histoire.config.ts'))
  })

  it('prefers poveste over a histoire config sitting beside it', () => {
    write('histoire.config.ts', 'poveste.config.ts')

    expect(resolveConfigFile(dir)).toBe(join(dir, 'poveste.config.ts'))
  })

  it('prefers the .ts spelling over the .js one', () => {
    write('poveste.config.js', 'poveste.config.ts')

    expect(resolveConfigFile(dir)).toBe(join(dir, 'poveste.config.ts'))
  })

  it.each(['.poveste.ts', '.poveste.js', '.histoire.ts', '.histoire.js'])('resolves the %s dotfile', (name) => {
    write(name)

    expect(resolveConfigFile(dir)).toBe(join(dir, name))
  })

  it('walks up to a config in an ancestor directory', () => {
    write('poveste.config.ts')
    const nested = join(dir, 'packages', 'app')
    mkdirSync(nested, { recursive: true })

    expect(resolveConfigFile(nested)).toBe(join(dir, 'poveste.config.ts'))
  })

  // Proximity beats family: every name is tried in a directory before moving up,
  // so a nested project's own histoire config wins over a poveste one above it.
  it('prefers a nearer histoire config over a poveste config further up', () => {
    write('poveste.config.ts')
    const nested = join(dir, 'packages', 'app')
    mkdirSync(nested, { recursive: true })
    writeFileSync(join(nested, 'histoire.config.ts'), 'export default {}')

    expect(resolveConfigFile(nested)).toBe(join(nested, 'histoire.config.ts'))
  })

  it('resolves an explicit path against the working directory', () => {
    expect(resolveConfigFile(dir, 'custom.config.ts')).toBe(resolve('custom.config.ts'))
  })

  it('returns nothing when no config exists anywhere above', () => {
    expect(resolveConfigFile(dir)).toBeNull()
  })
})
