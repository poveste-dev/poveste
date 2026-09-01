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
 * Top-level keys of `PovesteConfig`, in declaration order.
 *
 * Brace and bracket depth rather than a TypeScript parse: `tree`, `theme` and
 * `build` are inline object literals whose own keys are not top-level config,
 * and this file is the only input, so a compiler pass would cost a dependency
 * to answer a question counting characters already answers.
 */
export function configKeys(source: string): string[] {
  const body = /export interface PovesteConfig \{\n(.*?)\n\}/s.exec(source)?.[1]
  if (body === undefined) {
    throw new Error(`could not find \`export interface PovesteConfig\` in ${TYPES}`)
  }

  const keys: string[] = []
  let depth = 0
  for (const line of body.split('\n')) {
    const key = depth === 0 ? /^\s*([A-Z_$][\w$]*)\??\s*:/i.exec(line)?.[1] : undefined
    if (key !== undefined) {
      keys.push(key)
    }
    for (const char of line) {
      if (char === '{' || char === '[') depth++
      if (char === '}' || char === ']') depth--
    }
  }
  return keys
}

/** Keys the reference documents, from its `## \`key\`` headings. */
export function documentedKeys(markdown: string): string[] {
  return [...markdown.matchAll(/^## `([^`]+)`/gm)].map(match => match[1])
}

export function undocumentedKeys(source: string, markdown: string): string[] {
  const documented = new Set(documentedKeys(markdown))
  return configKeys(source).filter(key => !documented.has(key))
}

/** Headings that no longer match a key — a rename leaves one of each behind. */
export function staleEntries(source: string, markdown: string): string[] {
  const keys = new Set(configKeys(source))
  // Sub-keys are documented as `## `build`` plus `### `build.excludeFromVendorsChunk``,
  // so only the `##` headings are compared, and a dotted one is a sub-key.
  return documentedKeys(markdown).filter(entry => !entry.includes('.') && !keys.has(entry))
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
