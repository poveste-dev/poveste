import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import Module from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { createHighlighter } from 'shiki'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTwoslash } from '../twoslash.js'

const BOOK = join(import.meta.dirname, '../../..')

async function createHighlight(langs: string[]) {
  const highlighter = await createHighlighter({ themes: ['github-dark'], langs })
  return (code: string, lang: string, transformers: unknown[]) => highlighter.codeToHtml(code, { theme: 'github-dark', lang, transformers: transformers as never })
}

const textOf = (html: string | undefined) => html?.replace(/<[^>]+>/g, '')

describe('a `twoslash` fence in a book\'s markdown docs', () => {
  let highlight: (code: string, lang: string, transformers: unknown[]) => string

  beforeAll(async () => {
    highlight = await createHighlight(['ts', 'js'])
  })

  function rendered() {
    const warn = vi.fn()
    return { warn, twoslash: createTwoslash(BOOK, highlight, warn) }
  }

  it('shows each name\'s type on hover, focusable without a tab stop of its own', () => {
    const { twoslash } = rendered()

    const html = twoslash('const size: \'sm\' | \'md\' = \'sm\'', 'ts', {})

    const popup = textOf(html?.match(/<code class="twoslash-popup-code">(.*?)<\/code>/)?.[1])
    expect(html).toContain('<span class="twoslash-hover" tabindex="-1">')
    expect(popup).toBe('const size: "sm" | "md"')
  }, 60_000)

  it('shows types in a JavaScript block', () => {
    const { twoslash } = rendered()

    const html = twoslash('const last = [1, 2].at(-1)', 'js', {})

    expect(textOf(html)).toContain('const last: number | undefined')
  }, 60_000)

  it('renders a block in another language as plain code, naming where it is', () => {
    const { warn, twoslash } = rendered()

    const html = twoslash('<template />', 'vue', { file: 'src/Button.story.md', line: 4 })

    expect(html).toBeUndefined()
    expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/the `vue` block at src\/Button\.story\.md:4 renders without types/))
  })

  it('renders a block that does not compile as plain code, naming where it is', () => {
    const { warn, twoslash } = rendered()

    const html = twoslash('const n: number = \'one\'', 'ts', { file: 'src/Button.story.md', line: 12 })

    expect(html).not.toContain('twoslash-hover')
    expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/block at src\/Button\.story\.md:12, so it renders without types: \[2322\]/))
  }, 60_000)

  describe('warning about a block', () => {
    const BROKEN = 'const n: number = \'one\''
    const AT = { file: 'src/Button.story.md', line: 12 }

    it('warns once when the same block is rendered again', () => {
      const { warn, twoslash } = rendered()

      twoslash(BROKEN, 'ts', AT)
      twoslash(BROKEN, 'ts', AT)

      expect(warn).toHaveBeenCalledTimes(1)
    })

    it('warns once about a block in another language rendered again', () => {
      const { warn, twoslash } = rendered()

      twoslash('<template />', 'vue', AT)
      twoslash('<template />', 'vue', AT)

      expect(warn).toHaveBeenCalledTimes(1)
    })

    it('warns again when the block changes', () => {
      const { warn, twoslash } = rendered()

      twoslash(BROKEN, 'ts', AT)
      twoslash('const n: number = \'two\'', 'ts', AT)

      expect(warn).toHaveBeenCalledTimes(2)
    })

    it('warns about the same code in two places', () => {
      const { warn, twoslash } = rendered()

      twoslash(BROKEN, 'ts', AT)
      twoslash(BROKEN, 'ts', { file: 'src/Other.story.md', line: 3 })

      expect(warn).toHaveBeenCalledTimes(2)
    })

    it('warns again when a block that was fixed breaks the same way', () => {
      const { warn, twoslash } = rendered()

      twoslash(BROKEN, 'ts', AT)
      twoslash('const n: number = 1', 'ts', AT)
      twoslash(BROKEN, 'ts', AT)

      expect(warn).toHaveBeenCalledTimes(2)
    })
  }, 60_000)
})

const resolve = Module as unknown as { _resolveFilename: (request: string, parent?: { filename?: string }, ...rest: unknown[]) => string }

describe('a `twoslash` fence in a book on TypeScript 7', () => {
  let root: string
  let highlight: (code: string, lang: string, transformers: unknown[]) => string
  const resolveFilename = resolve._resolveFilename

  // TypeScript 7's `require('typescript')` gives only its version, and has no `lib` files
  // where TypeScript 6 keeps them (#1464). npm hoists it beside `@typescript/vfs`, which
  // finds it there: the workspace's pnpm layout would hand it 6.0.3, so that is redirected.
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'poveste-twoslash-'))
    const ts = join(root, 'node_modules/typescript')
    mkdirSync(ts, { recursive: true })
    writeFileSync(join(ts, 'package.json'), JSON.stringify({ name: 'typescript', version: '7.0.2', main: 'index.js' }))
    writeFileSync(join(ts, 'index.js'), 'module.exports = { version: \'7.0.2\' }\n')
    resolve._resolveFilename = (request, parent, ...rest) => request === 'typescript' && parent?.filename?.includes('@typescript/vfs')
      ? join(ts, 'index.js')
      : resolveFilename.call(Module, request, parent, ...rest)
    highlight = await createHighlight(['ts'])
  })
  afterAll(() => {
    resolve._resolveFilename = resolveFilename
    rmSync(root, { recursive: true, force: true })
  })

  it('is compiled with Poveste\'s TypeScript 6', () => {
    const warn = vi.fn()

    const html = createTwoslash(root, highlight, warn)('const last = [1, 2].at(-1)', 'ts', {})

    expect(textOf(html)).toContain('Array&#x3C;number>.at(index: number)')
    expect(warn).not.toHaveBeenCalled()
  }, 60_000)
})

describe('a `twoslash` fence after Twoslash failed to load', () => {
  const resolveFilename = resolve._resolveFilename
  afterAll(() => {
    resolve._resolveFilename = resolveFilename
  })

  it('loads it on a later fence, once the dependencies are back', async () => {
    const warn = vi.fn()
    const twoslash = createTwoslash(BOOK, await createHighlight(['ts']), warn)
    resolve._resolveFilename = (request, ...rest) => {
      if (request === '@shikijs/twoslash/core') {
        throw new Error('Cannot find module \'@shikijs/twoslash/core\'')
      }
      return resolveFilename.call(Module, request, ...rest)
    }
    twoslash('const a = 1', 'ts', {})
    twoslash('const a = 1', 'ts', {})
    resolve._resolveFilename = resolveFilename

    const html = twoslash('const a = 1', 'ts', {})

    expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('Twoslash is off'))
    expect(html).toContain('twoslash-hover')
  }, 60_000)
})
