import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import Module from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { createHighlighter } from 'shiki'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTwoslash } from '../twoslash.js'

// This package has `@shikijs/twoslash` and TypeScript 6 installed, as a book that opts in does.
const BOOK = join(import.meta.dirname, '../../..')

describe('a `twoslash` fence in a book\'s markdown docs', () => {
  let highlight: (code: string, lang: string, transformers: unknown[]) => string

  beforeAll(async () => {
    const highlighter = await createHighlighter({ themes: ['github-dark'], langs: ['ts'] })
    highlight = (code, lang, transformers) => highlighter.codeToHtml(code, { theme: 'github-dark', lang, transformers: transformers as never })
  })

  it('shows each name\'s type on hover, reachable from the keyboard', () => {
    const twoslash = createTwoslash(BOOK, highlight, vi.fn())

    const html = twoslash('const size: \'sm\' | \'md\' = \'sm\'', 'ts', {})

    const popup = html?.match(/<code class="twoslash-popup-code">(.*?)<\/code>/)?.[1]?.replace(/<[^>]+>/g, '')
    expect(html).toContain('<span class="twoslash-hover" tabindex="0">')
    expect(popup).toBe('const size: "sm" | "md"')
  }, 60_000)

  it('renders a block that does not compile as plain code, naming where it is', () => {
    const warn = vi.fn()
    const twoslash = createTwoslash(BOOK, highlight, warn)

    const html = twoslash('const n: number = \'one\'', 'ts', { file: 'src/Button.story.md', line: 12 })

    expect(html).not.toContain('twoslash-hover')
    expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/block at src\/Button\.story\.md:12, so it renders without types: \[2322\]/))
  }, 60_000)
})

describe('a book Twoslash cannot run in', () => {
  let root: string
  const nodePath = process.env['NODE_PATH']
  const initPaths = (Module as unknown as { _initPaths: () => void })._initPaths

  // pnpm runs this with `NODE_PATH` at the workspace's store, which Node falls back to,
  // so a book with nothing installed would still find this package's copy.
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'poveste-twoslash-'))
    delete process.env['NODE_PATH']
    initPaths()
  })
  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
    if (nodePath !== undefined) {
      process.env['NODE_PATH'] = nodePath
    }
    initPaths()
  })

  it('says why once, however many fences ask, and leaves them to plain highlighting', () => {
    const warn = vi.fn()
    const twoslash = createTwoslash(root, vi.fn(), warn)

    expect([twoslash('let a = 1', 'ts', {}), twoslash('let b = 2', 'ts', {})]).toEqual([undefined, undefined])
    expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/needs `@shikijs\/twoslash` and TypeScript 6 or earlier in the book/))
  })

  it('names the TypeScript it found when that is 7 or later', () => {
    const shiki = join(root, 'node_modules/@shikijs/twoslash')
    mkdirSync(shiki, { recursive: true })
    writeFileSync(join(shiki, 'package.json'), JSON.stringify({ name: '@shikijs/twoslash', exports: { './core': './core.mjs' } }))
    writeFileSync(join(shiki, 'core.mjs'), 'export {}\n')
    const ts = join(root, 'node_modules/typescript')
    mkdirSync(ts, { recursive: true })
    writeFileSync(join(ts, 'package.json'), JSON.stringify({ name: 'typescript', version: '7.0.2', main: 'index.js' }))
    writeFileSync(join(ts, 'index.js'), 'module.exports = { version: \'7.0.2\' }\n')
    const warn = vi.fn()

    expect(createTwoslash(root, vi.fn(), warn)('let a = 1', 'ts', {})).toBeUndefined()
    expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/TypeScript 6 or earlier, and this book has TypeScript 7\.0\.2/))
  })
})
