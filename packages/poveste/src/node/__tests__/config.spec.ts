import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDefaultConfig, loadConfigFile, mergeConfig, resolveConfigFile } from '../config.js'

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

// Loaded by Vite's bundling config loader since #870, which replaced jiti. What a
// config could rely on under jiti has to keep working, and the #324 hint depends
// on recognising errors the loader words differently.
describe('loadConfigFile', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'poveste-load-'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    rmSync(dir, { recursive: true, force: true })
  })

  function write(name: string, contents: string): string {
    const file = join(dir, name)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, contents)
    return file
  }

  // One difference from jiti: both paths come back through `realpath`, so a config
  // reached through a symlinked directory (macOS's `/var` is `/private/var`) sees
  // the real path where jiti kept the one it was given.
  it('resolves __dirname, import.meta.url and an extensionless relative import', async () => {
    write('theme/colors.ts', `export const brand: string = 'teal'\n`)
    const file = write('poveste.config.ts', [
      `import { fileURLToPath } from 'node:url'`,
      `import { brand } from './theme/colors'`,
      `export default { outDir: brand, storyMatch: [__dirname, fileURLToPath(import.meta.url)] }`,
    ].join('\n'))

    const config = await loadConfigFile(file)

    expect(config.outDir).toBe('teal')
    expect(config.storyMatch).toEqual([realpathSync(dir), realpathSync(file)])
  })

  it('loads a legacy histoire.config.ts', async () => {
    const file = write('histoire.config.ts', `export default { outDir: 'from-histoire' }\n`)

    expect((await loadConfigFile(file)).outDir).toBe('from-histoire')
  })

  // `poveste dev` restarts on a config edit, and a cached module would restart
  // into the config it had before the edit.
  it('reads a config and what it imports fresh on every load', async () => {
    write('shared.ts', `export const dir = 'first'\n`)
    const file = write('poveste.config.ts', `import { dir } from './shared'\nexport default { outDir: dir }\n`)
    expect((await loadConfigFile(file)).outDir).toBe('first')

    write('shared.ts', `export const dir = 'second'\n`)

    expect((await loadConfigFile(file)).outDir).toBe('second')
  })

  it('names a package a config imports that is not installed, without the stack (#324)', async () => {
    const file = write('poveste.config.ts', `import missing from 'poveste-not-installed-xyz'\nexport default { missing }\n`)

    await expect(loadConfigFile(file)).rejects.toThrow(`Cannot find module 'poveste-not-installed-xyz' imported from ${file}`)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Is it installed, and is the name spelt correctly?'))
  })

  // The wording depends on where the config sits. With no `node_modules` above it,
  // Vite's resolver says "module", as jiti did; in a project, Node imports the
  // bundle and says "package". So this one sits inside this package, and runs the
  // CLI, because inside Vitest the import goes through Vitest instead.
  it('names it from the CLI in a project, where Node says "package"', () => {
    const project = mkdtempSync(join(resolve(__dirname, '../../../node_modules'), '.poveste-config-spec-'))
    try {
      writeFileSync(join(project, 'poveste.config.ts'), `import missing from 'poveste-not-installed-xyz'\nexport default { missing }\n`)

      const result = spawnSync(process.execPath, [resolve(__dirname, '../../../bin.mjs'), 'build'], { cwd: project, encoding: 'utf8', timeout: 60_000 })
      const output = result.stdout + result.stderr

      expect(output).toContain(`Cannot find module 'poveste-not-installed-xyz'`)
      expect(output).toContain('Is it installed, and is the name spelt correctly?')
    }
    finally {
      rmSync(project, { recursive: true, force: true })
    }
  })

  it('names a relative import that does not exist the same way', async () => {
    const file = write('poveste.config.ts', `import './theme/typo'\nexport default {}\n`)

    await expect(loadConfigFile(file)).rejects.toThrow(`Cannot find module './theme/typo' imported from ${file}`)
  })

  // Loaded as an ES module under jiti whatever the package said. Vite bundles a config
  // in a package that is not `"type": "module"` to CommonJS, which rejects top-level
  // await, so the error has to say what to change.
  it('says how to fix top-level await in a config that is not an ES module', async () => {
    write('package.json', '{}\n')
    const file = write('poveste.config.ts', `const outDir = await Promise.resolve('dist')\nexport default { outDir }\n`)

    await expect(loadConfigFile(file)).rejects.toThrow('uses top-level await, which a config only supports as an ES module: set "type": "module" in its package.json.')
  })

  // The fix that error names, and the reason it names no other: `configFileNames`
  // has no `.mts`, so a renamed config would not be found.
  it('loads top-level await in a config that is an ES module', async () => {
    write('package.json', '{ "type": "module" }\n')
    const file = write('poveste.config.ts', `const outDir = await Promise.resolve('dist')\nexport default { outDir }\n`)

    expect((await loadConfigFile(file)).outDir).toBe('dist')
  })

  it('says a config with no default export has none', async () => {
    const file = write('poveste.config.ts', `export const outDir = 'dist'\n`)

    await expect(loadConfigFile(file)).rejects.toThrow()
  })
})
