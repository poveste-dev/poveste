import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { nodeResolver } from '../vendors.js'

const FIXTURE = path.resolve(__dirname, './build-devtools-api')
const BIN = path.resolve(__dirname, '../../../bin.mjs')
const OUT_DIR = path.join(FIXTURE, '.poveste', 'dist')
const INSTALLED = path.join(FIXTURE, 'node_modules', '@vue', 'devtools-api')

function buildBook(stories: string) {
  const result = spawnSync(process.execPath, [BIN, 'build'], {
    cwd: FIXTURE,
    encoding: 'utf8',
    env: { ...process.env, POVESTE_DEVTOOLS_STORIES: stories },
    timeout: 120_000,
  })
  return { status: result.status, output: result.stdout + result.stderr }
}

function builtCode() {
  return readdirSync(OUT_DIR, { recursive: true, encoding: 'utf8' })
    .filter(file => statSync(path.join(OUT_DIR, file)).isFile())
    .map(file => readFileSync(path.join(OUT_DIR, file), 'utf8'))
    .join('\n')
}

/** The copy `@poveste/vendors` pins, linked in so its own dependencies still resolve. */
function installPublishedVersion() {
  const vendors = path.join(nodeResolver('@poveste/vendors/vue', __dirname)!, '..')
  const published = path.join(vendors, 'node_modules', '@vue', 'devtools-api')
  expect(existsSync(published), published).toBe(true)
  mkdirSync(path.dirname(INSTALLED), { recursive: true })
  // A junction, because a Windows runner may not create a directory symlink.
  symlinkSync(published, INSTALLED, 'junction')
}

/** A later `@vue/devtools-api`, with names no published version exports. */
function installLaterVersion() {
  mkdirSync(path.join(INSTALLED, 'dist'), { recursive: true })
  writeFileSync(path.join(INSTALLED, 'package.json'), JSON.stringify({
    name: '@vue/devtools-api',
    version: '99.0.0',
    type: 'module',
    exports: { '.': './dist/index.js' },
  }))
  writeFileSync(path.join(INSTALLED, 'dist', 'index.js'), [
    'import { later } from \'./kit.js\'',
    'export { later as onDevToolsLaterHook }',
    'export * from \'./later.js\'',
    'export function setupDevtoolsPlugin() { globalThis.marker = \'only the real module says this\' }',
  ].join('\n'))
  writeFileSync(path.join(INSTALLED, 'dist', 'kit.js'), 'export function later() {}\n')
  writeFileSync(path.join(INSTALLED, 'dist', 'later.js'), 'export function sinceLaterVersion() {}\n')
}

// A built book swaps `@vue/devtools-api` for a no-op stub (#791), and Rolldown
// fails the build on any name the stub does not export (#1637).
describe('the devtools API stub in a built book', () => {
  afterEach(() => {
    rmSync(path.join(FIXTURE, '.poveste'), { recursive: true, force: true })
    rmSync(path.join(FIXTURE, 'node_modules'), { recursive: true, force: true })
  })

  it('exports every name the published package does', () => {
    installPublishedVersion()
    const { status, output } = buildBook('every-name.story.js')

    expect(output).not.toContain('MISSING_EXPORT')
    expect(status, output).toBe(0)
    // A function only the real module defines, as `devtools-registration.spec.ts` reads it.
    expect(builtCode()).not.toContain('callDevToolsPluginSetupFn')
  }, 180_000)

  it('exports the names of a later version the book has installed, and still none of its code', () => {
    installLaterVersion()
    const { status, output } = buildBook('installed-name.story.js')

    expect(output).not.toContain('MISSING_EXPORT')
    expect(status, output).toBe(0)
    expect(builtCode()).not.toContain('only the real module says this')
  }, 180_000)
})
