import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { nodeBuiltinsPlugin, nodeBuiltinsWarning } from '../node-builtins.js'

const FIXTURE = path.resolve(__dirname, './build-node-builtin')
const BIN = path.resolve(__dirname, '../../../bin.mjs')
const WARNING = 'reached the browser bundle'

function buildBook(env: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, [BIN, 'build'], {
    cwd: FIXTURE,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 120_000,
  })
  return { status: result.status, output: result.stdout + result.stderr }
}

describe('a Node built-in in the browser bundle', () => {
  afterEach(() => {
    rmSync(path.join(FIXTURE, '.poveste'), { recursive: true, force: true })
  })

  it('warns, naming the built-in and the file that imports it, and still builds', () => {
    const { status, output } = buildBook()

    expect(status, output).toBe(0)
    expect(output).toContain(`1 Node built-in ${WARNING}`)
    expect(output).toContain('node:fs, imported by helper.js')
  }, 180_000)

  it('warns when the book\'s log level hides Vite\'s own line', () => {
    const { output } = buildBook({ POVESTE_BUILTIN_LOG_LEVEL: 'error' })

    expect(output).not.toContain('externalized for browser compatibility')
    expect(output).toContain('node:fs, imported by helper.js')
  }, 180_000)

  it('says nothing about a built-in the book has replaced with a polyfill', () => {
    const { status, output } = buildBook({ POVESTE_BUILTIN_POLYFILL: '1' })

    expect(status, output).toBe(0)
    expect(output).not.toContain(WARNING)
  }, 180_000)

  it('says nothing about a book that imports none', () => {
    const { status, output } = buildBook({ POVESTE_BUILTIN_STORIES: 'clean.story.js' })

    expect(status, output).toBe(0)
    expect(output).not.toContain(WARNING)
  }, 180_000)
})

describe('nodeBuiltinsPlugin', () => {
  // The polyfill above runs first, because the book's plugins come before this one.
  // One added later, through `changeViteConfig`, runs after it, and this is that order.
  async function resolveAs(id: string) {
    const found = new Map<string, Set<string>>()
    const resolveId = nodeBuiltinsPlugin(found).resolveId as (...args: unknown[]) => Promise<unknown>
    await resolveId.call({ resolve: async () => ({ id }) }, 'node:fs', '/book/helper.js', {})
    return found
  }

  it('records a built-in that resolves to the empty module', async () => {
    expect(await resolveAs('__vite-browser-external')).toEqual(new Map([['node:fs', new Set(['/book/helper.js'])]]))
  })

  it('leaves out a built-in that resolves to anything else', async () => {
    expect(await resolveAs('/book/shim.js')).toEqual(new Map())
  })
})

describe('nodeBuiltinsWarning', () => {
  it('names a Vue block\'s importer once, without its query', () => {
    const lines = nodeBuiltinsWarning(
      new Map([['node:url', new Set(['/book/src/A.story.vue?vue&type=script&setup=true', '/book/src/A.story.vue', '/book/src/b.js'])]]),
      '/book',
    )

    expect(lines[1]).toBe('   node:url, imported by src/A.story.vue, src/b.js')
  })

  it('counts more than one built-in in the plural', () => {
    const lines = nodeBuiltinsWarning(new Map([['node:fs', new Set<string>()], ['node:url', new Set<string>()]]), '/book')

    expect(lines[0]).toContain(`2 Node built-ins ${WARNING}`)
  })
})
