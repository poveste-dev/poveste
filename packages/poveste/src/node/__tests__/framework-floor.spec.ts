import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
// @ts-expect-error plain ES2015, deliberately outside `src` and outside `dist`
import { frameworkProblems, rangeFloor } from '../../../framework-floor.mjs'

const PACKAGE = path.resolve(__dirname, '../../..')

/** A project whose `node_modules` holds these manifests, removed when the test ends. */
function project(manifests: Record<string, object>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'poveste-framework-floor-'))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  for (const [name, manifest] of Object.entries(manifests)) {
    const dir = path.join(root, 'node_modules', name)
    mkdirSync(dir, { recursive: true })
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, ...manifest }))
  }
  return root
}

const PLUGIN_NUXT = { '@poveste/plugin-nuxt': { version: '0.17.0', peerDependencies: { nuxt: '^4.5.0' } } }

// The project #1062 was found on: Nuxt 3, installed with `--legacy-peer-deps`.
describe('a Nuxt below the plugin\'s peer floor', () => {
  it('is a problem naming the installed Nuxt, the plugin and its range', () => {
    const root = project({ ...PLUGIN_NUXT, nuxt: { version: '3.21.11' } })

    expect(frameworkProblems(root)).toEqual([
      'You are using nuxt 3.21.11. @poveste/plugin-nuxt requires nuxt ^4.5.0. Please upgrade nuxt.',
    ])
  })

  it('is found from a directory below the project root, as Node would find it', () => {
    const root = project({ ...PLUGIN_NUXT, nuxt: { version: '3.21.11' } })
    const nested = path.join(root, 'src', 'stories')
    mkdirSync(nested, { recursive: true })

    expect(frameworkProblems(nested)).toHaveLength(1)
  })

  it('exits 1 from the CLI before the CLI is loaded', () => {
    const root = project({ ...PLUGIN_NUXT, nuxt: { version: '3.21.11' } })
    let status = 0
    let stderr = ''

    try {
      execFileSync(process.execPath, [path.join(PACKAGE, 'bin.mjs'), 'dev'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    }
    catch (error: any) {
      status = error.status
      stderr = String(error.stderr)
    }

    expect(status).toBe(1)
    expect(stderr).toBe('You are using nuxt 3.21.11. @poveste/plugin-nuxt requires nuxt ^4.5.0. Please upgrade nuxt.\n')
  })
})

describe('a project the check has nothing to say about', () => {
  it('is fine at the floor', () => {
    expect(frameworkProblems(project({ ...PLUGIN_NUXT, nuxt: { version: '4.5.0' } }))).toEqual([])
  })

  it('is fine above it', () => {
    expect(frameworkProblems(project({ ...PLUGIN_NUXT, nuxt: { version: '4.5.2' } }))).toEqual([])
  })

  it('is fine without the plugin, whatever Nuxt it has', () => {
    expect(frameworkProblems(project({ nuxt: { version: '3.21.11' } }))).toEqual([])
  })

  it('is fine with the plugin and no Nuxt installed, which is the package manager\'s to report', () => {
    expect(frameworkProblems(project(PLUGIN_NUXT))).toEqual([])
  })

  it('says nothing when the plugin\'s range is a shape it cannot read', () => {
    const root = project({ '@poveste/plugin-nuxt': { peerDependencies: { nuxt: '^3 || ^4' } }, 'nuxt': { version: '2.18.1' } })

    expect(frameworkProblems(root)).toEqual([])
  })
})

describe('reading a peer floor', () => {
  it('takes a caret or a `>=` range', () => {
    expect(rangeFloor('^4.5.0')).toEqual([4, 5, 0])
    expect(rangeFloor('>=4.5.0')).toEqual([4, 5, 0])
  })

  it('refuses every other shape', () => {
    expect(rangeFloor('^3 || ^4')).toBeNull()
    expect(rangeFloor('~4.5.0')).toBeNull()
    expect(rangeFloor(undefined)).toBeNull()
  })
})
