import { createRequire } from 'node:module'
import { dirname } from 'pathe'
import pc from 'picocolors'
import { bundledTypescript } from './docgen/typed.js'

/** Where a fence sits, for a message about it. */
export interface FenceAt {
  file?: string
  line?: number
}

export type Twoslash = (code: string, lang: string, at: FenceAt) => string | undefined

const LANGS = ['ts', 'tsx', 'js', 'jsx']
const ALIASES: Record<string, string> = { typescript: 'ts', javascript: 'js' }
// A dev server edits blocks for hours; the oldest compiled block goes first past this.
const CACHED_BLOCKS = 500

/*
 * A fence marked `twoslash` in a book's markdown docs shows types on hover (#1525).
 * Nothing loads until the first one is met: a book that marks none never loads
 * TypeScript for its docs. It compiles with the TypeScript 6 auto-docs reads with
 * (#1464), whatever the book has, and reads that copy's `lib` files too: left to
 * itself, `@typescript/vfs` takes them from whichever `typescript` it finds beside it.
 */
export function createTwoslash(root: string, highlight: (code: string, lang: string, transformers: unknown[]) => string, warn: (message: string) => void = message => console.warn(message)): Twoslash {
  let state: { transformer: (at: FenceAt, onError: (error: unknown) => void) => unknown } | { off: string } | undefined
  // What each place was last warned about. A `<docs>` block is rendered once for each
  // Vite server, and only a change to the block is news (#1571).
  const warned = new Map<string, string>()

  function warnOnce(at: FenceAt, code: string, message: string) {
    if (warned.get(where(at)) !== code) {
      warned.set(where(at), code)
      warn(pc.yellow(message))
    }
  }

  function load() {
    try {
      const own = createRequire(import.meta.url)
      const fromShiki = createRequire(own.resolve('@shikijs/twoslash/core'))
      // Synchronous, as markdown-it's `highlight` is: Node requires an ES module without top-level await.
      const { createTransformerFactory, rendererRich } = fromShiki('@shikijs/twoslash/core')
      const { createTwoslasher } = fromShiki('twoslash/core')
      const twoslasher = createTwoslasher({ tsModule: bundledTypescript(), tsLibDirectory: dirname(own.resolve('typescript')), vfsRoot: root })
      const factory = createTransformerFactory(twoslasher, rendererRich({
        // Out of the tab order: the block is one stop, and the docs panel moves between its names with the arrow keys.
        hast: { hoverToken: { properties: { tabindex: -1 } } },
      }))
      const compiled = new Map<string, unknown>()
      const typesCache = {
        read: (code: string, lang: string) => compiled.get(`${lang}\0${code}`),
        write: (code: string, result: unknown, lang: string) => {
          compiled.set(`${lang}\0${code}`, result)
          if (compiled.size > CACHED_BLOCKS) {
            compiled.delete(compiled.keys().next().value!)
          }
        },
      }
      return {
        transformer: (at: FenceAt, onError: (error: unknown) => void) => factory({
          langs: LANGS,
          explicitTrigger: false,
          typesCache,
          onTwoslashError: onError,
        }),
      }
    }
    catch (error) {
      return { off: `Twoslash is off: it could not load, so a \`twoslash\` fence renders as plain code. Reinstall the book's dependencies. ${firstLine(error)}` }
    }
  }

  return (code, lang, at) => {
    const name = ALIASES[lang] ?? lang
    if (!LANGS.includes(name)) {
      warnOnce(at, code, `[poveste] Twoslash reads TypeScript and JavaScript only, so the \`${lang}\` block at ${where(at)} renders without types.`)
      return undefined
    }
    // A failed load is tried again, so reinstalling during `poveste dev` needs no restart.
    if (!state || 'off' in state) {
      const loaded = load()
      if ('off' in loaded && (!state || loaded.off !== state.off)) {
        warn(pc.yellow(`[poveste] ${loaded.off}`))
      }
      state = loaded
    }
    if ('off' in state) {
      return undefined
    }
    let failed = false
    const html = highlight(code, name, [state.transformer(at, (error) => {
      failed = true
      warnOnce(at, code, `[poveste] Twoslash could not compile the block at ${where(at)}, so it renders without types: ${firstLine(error)}`)
    })])
    // So a block that is fixed and then broken the same way is news again.
    if (!failed) {
      warned.delete(where(at))
    }
    return html
  }
}

function where(at: FenceAt): string {
  return at.file ? `${at.file}${at.line ? `:${at.line}` : ''}` : 'a markdown file'
}

function firstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const lines = message.split('\n').map(line => line.trim()).filter(Boolean)
  // Twoslash leads with a heading; the compiler's own line is what names the problem.
  return lines.find(line => /^\[\d+\]/.test(line)) ?? lines[0] ?? 'unknown error'
}
