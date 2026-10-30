import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { createHighlighter } from 'shiki'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTwoslash } from '../twoslash.js'

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

describe('a `twoslash` fence in a book on TypeScript 7', () => {
  let root: string
  let highlight: (code: string, lang: string, transformers: unknown[]) => string

  // TypeScript 7's `require('typescript')` gives only its version (#1464).
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'poveste-twoslash-'))
    const ts = join(root, 'node_modules/typescript')
    mkdirSync(ts, { recursive: true })
    writeFileSync(join(ts, 'package.json'), JSON.stringify({ name: 'typescript', version: '7.0.2', main: 'index.js' }))
    writeFileSync(join(ts, 'index.js'), 'module.exports = { version: \'7.0.2\' }\n')
    const highlighter = await createHighlighter({ themes: ['github-dark'], langs: ['ts'] })
    highlight = (code, lang, transformers) => highlighter.codeToHtml(code, { theme: 'github-dark', lang, transformers: transformers as never })
  })
  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('is compiled with Poveste\'s TypeScript 6', () => {
    const warn = vi.fn()

    const html = createTwoslash(root, highlight, warn)('const size: \'sm\' | \'md\' = \'sm\'', 'ts', {})

    expect(html).toContain('<span class="twoslash-hover" tabindex="0">')
    expect(warn).not.toHaveBeenCalled()
  }, 60_000)
})
