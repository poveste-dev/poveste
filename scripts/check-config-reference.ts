// Asserts that every top-level `PovesteConfig` key has a reference entry.
//
// 1.0 is a promise that the config file will not break without a major, and that
// promise cannot be made about a surface nobody wrote down: there is nothing to
// hold ourselves to, and no way for a reader to tell a supported key from an
// accident of the type definition (#152).
//
// Four keys had drifted out of the docs by the time this was written, and the
// issue reporting it named three of them plus a nested one — which is the point.
// A list of gaps maintained by hand is a snapshot of the day it was written.
//
// Deprecated and plugin-only keys still need an entry. "Documented" is not the
// same as "recommended", and an omission reads as an oversight rather than as a
// decision — so a key we do not intend books to set is documented saying so.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export const TYPES = 'packages/poveste-shared/src/types/config.ts'
export const REFERENCE = 'docs/reference/config.md'

/**
 * The source with comments and string contents blanked out, line structure kept.
 *
 * Depth counting used to run over the raw text, and a single unbalanced brace in
 * a JSDoc — `` Use `{` to open a brace expansion `` reads perfectly naturally —
 * desynchronised it for the rest of the interface. Keys after it were skipped,
 * and a key added last with such a comment made the whole check report success
 * while going undocumented, which is the one thing it exists to prevent.
 */
export function codeOnly(source: string): string {
  let out = ''
  let index = 0
  const blank = (text: string) => text.replace(/[^\n]/g, ' ')

  while (index < source.length) {
    const rest = source.slice(index)

    const comment = /^\/\/[^\n]*/.exec(rest)?.[0] ?? /^\/\*[\s\S]*?\*\//.exec(rest)?.[0]
    if (comment !== undefined) {
      out += blank(comment)
      index += comment.length
      continue
    }

    const quote = rest[0]
    if (quote === '\'' || quote === '"' || quote === '`') {
      let end = 1
      while (end < rest.length && rest[end] !== quote) {
        end += rest[end] === '\\' ? 2 : 1
      }
      const literal = rest.slice(0, Math.min(end + 1, rest.length))
      out += quote + blank(literal.slice(1, -1)) + (literal.length > 1 ? quote : '')
      index += literal.length
      continue
    }

    out += source[index]
    index++
  }
  return out
}

export interface ParsedConfig {
  /** Top-level keys, in declaration order. */
  keys: string[]
  /** For a key whose type is an inline object literal, that literal's own keys. */
  nested: Map<string, string[]>
}

/**
 * `PovesteConfig`, by delimiter depth rather than a TypeScript parse.
 *
 * `tree`, `theme`, `viteNodeTransformMode` and `build` are inline object
 * literals whose own keys are not top-level config, and this file is the only
 * input, so a compiler pass would cost a dependency to answer a question
 * counting delimiters answers — provided it counts only the ones that are code,
 * which is what `codeOnly` is for.
 */
export function parseConfig(source: string): ParsedConfig {
  const body = /export interface PovesteConfig \{\n(.*?)\n\}/s.exec(codeOnly(source))?.[1]
  if (body === undefined) {
    throw new Error(`could not find \`export interface PovesteConfig\` in ${TYPES}`)
  }

  const keys: string[] = []
  const nested = new Map<string, string[]>()
  let depth = 0
  let parent: string | undefined

  for (const line of body.split('\n')) {
    const key = /^\s*([A-Z_$][\w$]*)\??\s*:/i.exec(line)?.[1]
    if (key !== undefined && depth === 0) {
      keys.push(key)
      parent = key
    }
    else if (key !== undefined && depth === 1 && parent !== undefined) {
      nested.set(parent, [...(nested.get(parent) ?? []), key])
    }

    for (const char of line) {
      // Parentheses too: a multi-line function type would otherwise put its
      // parameter names at depth 0 and report them as config keys.
      if (char === '{' || char === '[' || char === '(') depth++
      if (char === '}' || char === ']' || char === ')') depth--
    }
  }

  if (depth !== 0) {
    throw new Error(`unbalanced delimiters in ${TYPES} — parsed to depth ${depth}, so some keys were skipped`)
  }
  return { keys, nested }
}

export function configKeys(source: string): string[] {
  return parseConfig(source).keys
}

/** Keys the reference documents, from its `## \`key\`` headings. */
export function documentedKeys(markdown: string): string[] {
  return [...markdown.matchAll(/^## `([^`]+)`/gm)].map(match => match[1])
}

/** Sub-keys the reference documents, from its `### \`parent.child\`` headings. */
export function documentedSubKeys(markdown: string): string[] {
  return [...markdown.matchAll(/^### `([^`]+)`/gm)].map(match => match[1]).filter(entry => entry.includes('.'))
}

export function undocumentedKeys(source: string, markdown: string): string[] {
  const documented = new Set(documentedKeys(markdown))
  return parseConfig(source).keys.filter(key => !documented.has(key))
}

/**
 * Entries that no longer match anything in the type — a rename leaves a missing
 * key and an orphan, and reporting only the first gets the entry edited in place
 * with the old one left behind.
 *
 * Sub-keys are checked in this direction only. Documenting every field of
 * `theme` is not the contract; documenting one that no longer exists still tells
 * a reader to set an option the build ignores.
 */
export function staleEntries(source: string, markdown: string): string[] {
  const { keys, nested } = parseConfig(source)
  const top = new Set(keys)

  const stale = documentedKeys(markdown).filter(entry => !entry.includes('.') && !top.has(entry))

  for (const entry of documentedSubKeys(markdown)) {
    const [parent, ...rest] = entry.split('.')
    const child = rest.join('.')
    if (!top.has(parent) || !(nested.get(parent) ?? []).includes(child)) {
      stale.push(entry)
    }
  }
  return stale
}

function main(): void {
  const source = readFileSync(join(ROOT, TYPES), 'utf8')
  const markdown = readFileSync(join(ROOT, REFERENCE), 'utf8')

  const undocumented = undocumentedKeys(source, markdown)
  const stale = staleEntries(source, markdown)

  if (undocumented.length > 0 || stale.length > 0) {
    console.error(`::error::${REFERENCE} does not match ${TYPES}\n`)
    for (const key of undocumented) {
      console.error(`  • \`${key}\` is a config key with no reference entry`)
    }
    for (const entry of stale) {
      console.error(`  • \`${entry}\` has a reference entry but is not a config key`)
    }
    console.error(`\nEvery key needs a heading in ${REFERENCE}. A key books should not set still`)
    console.error('needs one, saying so — an omission reads as an oversight rather than a decision.')
    process.exit(1)
  }

  console.log(`✅ All ${configKeys(source).length} config keys have a reference entry`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
