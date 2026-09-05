// Asserts the half of the conformance contract that is not a story file.
//
// A book can carry all 17 shared stories, register every id, and still fail 18
// specs: `toolbar-background` asserts six background presets, and the sixth
// exists only because each conformance book declares it in config. Promoting
// Quasar found that the expensive way, and the failure named a preset count
// rather than the missing declaration (#540).
//
// So the requirement is stated here, and checked, rather than left to a spec
// that counts buttons in a browser. Like the mirror guard (#400) this reads
// files instead of building a book, so it fails in seconds in `test:scripts`
// before any browser job starts.
//
// It also closes a drift the contract created: the six defaults are now spelled
// out in three places — `getDefaultConfig()`, the rgb list the spec indexes by
// position, and Quasar's literal copy, which cannot spread `getDefaultConfig()`
// because its published recipe already owns the import line (#543). Nothing
// compared them until this.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export const DEFAULTS = 'packages/poveste/src/node/config.ts'
export const SPEC = 'e2e/toolbar-background.spec.ts'

/**
 * The preset every conformance book adds on top of the defaults.
 *
 * Its only job is to be a sixth, so the spec proves the list is configurable
 * rather than hardcoded. The values are arbitrary and identical everywhere.
 */
export const CUSTOM_PRESET = { label: 'Custom gray', color: '#cafff5', contrastColor: '#005142' }

/** Config files a book might declare poveste in, in the order they are looked for. */
export const CONFIG_FILENAMES = ['poveste.config.ts', 'histoire.config.ts', 'vite.config.ts']

export interface Preset { label: string, color: string, contrastColor: string }

/** The `backgroundPresets` array in a source file, whatever its line breaks. */
export function presetsIn(source: string): Preset[] {
  const start = source.indexOf('backgroundPresets')
  if (start === -1) {
    return []
  }
  const open = source.indexOf('[', start)
  let depth = 0
  let end = open
  for (; end < source.length; end++) {
    if (source[end] === '[') {
      depth++
    }
    if (source[end] === ']') {
      depth--
      if (depth === 0) {
        break
      }
    }
  }
  const block = source.slice(open, end + 1).replace(/\s+/g, ' ')
  return [...block.matchAll(/label:\s*'([^']*)',\s*color:\s*'([^']*)',\s*contrastColor:\s*'([^']*)'/g)]
    .map(match => ({ label: match[1], color: match[2], contrastColor: match[3] }))
}

/** What the spec asserts, in the rendered form it compares against. */
export function specPresets(source: string): { bg: string, contrast: string }[] {
  const block = source.slice(source.indexOf('const presets = ['))
  const end = block.indexOf(']')
  return [...block.slice(0, end).matchAll(/bg:\s*'([^']*)',\s*contrast:\s*'([^']*)'/g)]
    .map(match => ({ bg: match[1], contrast: match[2] }))
}

/**
 * A config color as the browser reports it, which is what the spec compares.
 *
 * `transparent` is the one that is not a hex triple, and it is also the default
 * — getting it wrong would make the first preset silently unverifiable.
 */
export function toRendered(color: string): string {
  if (color === 'transparent') {
    return 'rgba(0, 0, 0, 0)'
  }
  const hex = color.replace('#', '')
  const full = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex
  const [r, g, b] = [0, 2, 4].map(offset => Number.parseInt(full.slice(offset, offset + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * The spec indexes presets by position, so this compares in order rather than
 * as a set — a reordered default list would keep every value and still assert
 * the wrong button.
 */
export function specProblems(expected: Preset[], spec: { bg: string, contrast: string }[]): string[] {
  if (spec.length === 0) {
    return [`${SPEC} has no \`const presets\` list to read — the shape this check reads has changed`]
  }
  if (spec.length !== expected.length) {
    return [`${SPEC} asserts ${spec.length} presets and the books declare ${expected.length}`]
  }
  return expected.flatMap((preset, index) => {
    const bg = toRendered(preset.color)
    const contrast = toRendered(preset.contrastColor)
    if (spec[index].bg !== bg || spec[index].contrast !== contrast) {
      return [`${SPEC} preset ${index} is ${spec[index].bg}/${spec[index].contrast}, and \`${preset.label}\` is ${bg}/${contrast}`]
    }
    return []
  })
}

/**
 * What a conformance book must declare.
 *
 * Spreading `getDefaultConfig().backgroundPresets` and listing the six literally
 * are both accepted: Quasar cannot spread it, because its published recipe owns
 * the import line and a second import fails lint (#543). What is not accepted is
 * a book that declares neither, which is the state that costs eighteen specs.
 */
export function bookProblems(name: string, file: string, source: string, defaults: Preset[]): string[] {
  const problems: string[] = []
  const where = `${name} (${file})`

  const spreads = /\.\.\.\(?\s*getDefaultConfig\(\)\.backgroundPresets/.test(source)
  const declared = presetsIn(source)

  if (!spreads) {
    const missing = defaults.filter(preset => !declared.some(entry => entry.color === preset.color && entry.contrastColor === preset.contrastColor))
    if (missing.length > 0) {
      problems.push(`${where} neither spreads \`getDefaultConfig().backgroundPresets\` nor declares ${missing.map(preset => `\`${preset.label}\``).join(', ')}`)
    }
  }

  if (!declared.some(preset => preset.color === CUSTOM_PRESET.color && preset.contrastColor === CUSTOM_PRESET.contrastColor)) {
    problems.push(`${where} does not declare the \`${CUSTOM_PRESET.label}\` preset, so \`toolbar-background\` finds five buttons where it asserts six`)
  }

  if (!/defaultBackgroundColor:\s*'transparent'/.test(source)) {
    problems.push(`${where} does not set \`defaultBackgroundColor: 'transparent'\`, which the same spec starts from`)
  }

  return problems
}

export function configFileFor(example: string): string | undefined {
  return CONFIG_FILENAMES
    .map(filename => join('examples', example, filename))
    .find(path => existsSync(join(ROOT, path)))
}

async function main(): Promise<void> {
  const problems: string[] = []

  const defaults = presetsIn(readFileSync(join(ROOT, DEFAULTS), 'utf8'))
  if (defaults.length === 0) {
    console.error(`::error::could not read \`backgroundPresets\` from ${DEFAULTS}`)
    process.exit(1)
  }

  problems.push(...specProblems(
    [...defaults, CUSTOM_PRESET],
    specPresets(readFileSync(join(ROOT, SPEC), 'utf8')),
  ))

  // A book carries the conformance set exactly when the root Playwright config
  // gives it a `:conformance` project — the same source of truth
  // `check-example-wiring.ts` uses, so a new book is covered by existing here.
  const playwright: any = (await import(pathToFileURL(join(ROOT, 'playwright.config.ts')).href)).default
  const books = [...new Set(
    (playwright.projects ?? [])
      .map((project: { name: string }) => project.name)
      .filter((name: string) => name.endsWith(':conformance'))
      .map((name: string) => name.split(':')[0]),
  )] as string[]

  if (books.length === 0) {
    problems.push('playwright.config.ts defines no `:conformance` project, so this checked nothing')
  }

  for (const book of books) {
    const file = configFileFor(book)
    if (file === undefined) {
      problems.push(`${book} has no ${CONFIG_FILENAMES.join(', ')} — nothing to read its conformance config from`)
      continue
    }
    problems.push(...bookProblems(book, file, readFileSync(join(ROOT, file), 'utf8'), defaults))
  }

  if (problems.length > 0) {
    console.error('::error::The conformance contract is not met by config\n')
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    console.error('\nA conformance book declares the background presets as well as carrying the stories.')
    console.error('See "The conformance contract" in ai/AGENTS.md.')
    process.exit(1)
  }

  console.log(`✅ ${books.length} conformance books declare the ${defaults.length + 1} background presets the shared specs assert`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
