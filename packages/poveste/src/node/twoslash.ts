import type ts from 'typescript'
import { createRequire } from 'node:module'
import { join } from 'pathe'
import pc from 'picocolors'
import { NEWEST_MAJOR } from './docgen/typescript.js'

/** Where a fence sits, for a message about it. */
export interface FenceAt {
  file?: string
  line?: number
}

type Highlighter = (code: string, lang: string, at: FenceAt) => string | undefined

/*
 * A fence marked `twoslash` in a book's markdown docs shows types on hover (#1525).
 * Nothing loads until the first one is met: a book that marks none never loads
 * TypeScript for its docs. `@shikijs/twoslash` and the `typescript` it compiles with
 * are the book's, as auto-docs reads the book's.
 */
export function createTwoslash(root: string, highlight: (code: string, lang: string, transformers: unknown[]) => string, warn: (message: string) => void = message => console.warn(message)): Highlighter {
  let state: { transformer: (at: FenceAt) => unknown } | { off: string } | undefined

  function load() {
    try {
      const fromBook = createRequire(join(root, 'package.json'))
      const shikiTwoslash = fromBook.resolve('@shikijs/twoslash/core')
      const fromShiki = createRequire(shikiTwoslash)
      // Synchronous, as markdown-it's `highlight` is: Node requires an ES module without top-level await.
      const typescript = fromShiki('typescript') as typeof ts
      const major = Number.parseInt(typescript.version, 10)
      if (major > NEWEST_MAJOR || typeof typescript.createProgram !== 'function') {
        return { off: `Twoslash is off: it compiles with TypeScript ${NEWEST_MAJOR} or earlier, and this book has TypeScript ${typescript.version}. A \`twoslash\` fence renders as plain code.` }
      }
      const { createTransformerFactory, rendererRich } = fromShiki('@shikijs/twoslash/core')
      const { createTwoslasher } = fromShiki('twoslash/core')
      const twoslasher = createTwoslasher({ tsModule: typescript, vfsRoot: root })
      const factory = createTransformerFactory(twoslasher, rendererRich({
        // Focusable, so a type opens from the keyboard as well as on hover.
        hast: { hoverToken: { properties: { tabindex: 0 } } },
      }))
      return {
        transformer: (at: FenceAt) => factory({
          explicitTrigger: false,
          onTwoslashError: (error: unknown) => {
            const where = at.file ? `${at.file}${at.line ? `:${at.line}` : ''}` : 'a markdown file'
            warn(pc.yellow(`[poveste] Twoslash could not compile the block at ${where}, so it renders without types: ${firstLine(error)}`))
          },
        }),
      }
    }
    catch {
      return { off: 'Twoslash is off: a `twoslash` fence needs `@shikijs/twoslash` and TypeScript 6 or earlier in the book: `npm i -D @shikijs/twoslash typescript@6`. It renders as plain code.' }
    }
  }

  return (code, lang, at) => {
    if (!state) {
      state = load()
      if ('off' in state) {
        warn(pc.yellow(`[poveste] ${state.off}`))
      }
    }
    return 'off' in state ? undefined : highlight(code, lang, [state.transformer(at)])
  }
}

function firstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const lines = message.split('\n').map(line => line.trim()).filter(Boolean)
  // Twoslash leads with a heading; the compiler's own line is what names the problem.
  return lines.find(line => /^\[\d+\]/.test(line)) ?? lines[0] ?? 'unknown error'
}
