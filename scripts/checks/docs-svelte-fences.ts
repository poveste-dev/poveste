// Compiles every ```svelte fence in `docs/`, because the first TypeScript example
// a Svelte reader copies did not compile and nothing here could tell.
//
// `import type { Hst }` beside `export let Hst: Hst` is two declarations of one
// name in one scope, which Svelte rejects with `Identifier 'Hst' has already been
// declared`. It was in 15 fences across 7 pages — every TypeScript Svelte example
// the docs had — and survived because a fence is prose to every check we run and
// to VitePress, which renders it whether or not it means anything (#902).
//
// The compiler rather than a pattern: the defect is "this does not compile", and a
// rule matching the one spelling that caused it would pass the next one. Svelte 5
// compiles a `lang="ts"` block directly, so no preprocessor is needed for what a
// fence can contain.
//
// No skip-list. A fence that cannot compile is a fence a reader cannot copy — the
// two cases worth allowing, a deliberate fragment and a file that is not a
// component, are both better written as a different language tag than as an
// exemption here. The one exception is keyed on the fence's own text rather than
// on a path; see `LEGACY_MARKER`.
//
// Compiled in *runes* mode, because that is the mode the reader's project is in.
// The current `sv create` sets `compilerOptions.runes` for every file outside
// `node_modules`, and there `export let` is a hard error. Compiling in the
// permissive default passed every legacy example while none of them built in the
// project the getting-started page had just told the reader to create (#1061).

import type { CheckResult } from './support/check-result.ts'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { compile } from 'svelte/compiler'

const ROOT = join(import.meta.dirname, '..', '..')

export const DOCS = 'docs'

/** Build output and VitePress's own sources are not pages anyone reads as markdown. */
const SKIPPED_DIRECTORIES = new Set(['dist', 'node_modules', '.vitepress', 'public'])

export interface Fence {
  file: string
  /** Its position in the file, so a message names the one that failed. */
  index: number
  source: string
}

export function fencesIn(file: string, markdown: string): Fence[] {
  // `svelte{6-9}` is the same fence with VitePress line highlighting. Matching only
  // ```svelte\n skipped those openers and spliced the next fence onto them, which
  // reads as a duplicate declaration rather than as a miss.
  return [...markdown.matchAll(/```svelte[^\n]*\n([\s\S]*?)```/g)]
    .map((match, index) => ({ file, index: index + 1, source: match[1] ?? '' }))
}

/*
 * A fence that says it is histoire's code, and is therefore legacy by definition.
 *
 * `migration-from-histoire.md` pairs before with after, and the before half has
 * to keep `export let` or it misrepresents what is being migrated from. Reading
 * the marker the page already writes, rather than the filename, keeps that narrow:
 * the Poveste half of the same page is held to runes like everything else, and a
 * fence that loses its marker stops being exempt.
 *
 * Anchored to the fence's opening line, with no `m` flag. Matching at any line
 * start exempted the whole fence wherever the marker sat, so a fence of Poveste
 * code that merely mentioned the marker — a trailing label, an inline note — was
 * silently excluded from runes checking, which is not what the paragraph above
 * promises.
 */
const LEGACY_MARKER = /^\s*<!--\s*histoire\s*-->/

export function fenceProblems(fences: Fence[]): string[] {
  return fences.flatMap(({ file, index, source }) => {
    const runes = LEGACY_MARKER.test(source) ? undefined : true
    try {
      compile(source, { name: 'Fence', generate: 'client', runes })
      return []
    }
    catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).split('\n')[0]
      const mode = runes ? ' in runes mode' : ''
      return [`${file} fence ${index} does not compile${mode}: ${message}`]
    }
  })
}

export function markdownFiles(root: string, directory = DOCS): string[] {
  const found: string[] = []

  for (const entry of readdirSync(join(root, directory))) {
    if (SKIPPED_DIRECTORIES.has(entry)) {
      continue
    }

    const path = join(root, directory, entry)
    if (statSync(path).isDirectory()) {
      found.push(...markdownFiles(root, relative(root, path)))
    }
    else if (entry.endsWith('.md')) {
      found.push(relative(root, path))
    }
  }

  return found
}

function repositoryProblems(root = ROOT): string[] {
  const fences = markdownFiles(root).flatMap(file => fencesIn(file, readFileSync(join(root, file), 'utf8')))

  if (fences.length === 0) {
    return [`no \`svelte\` fence under ${DOCS} — this check is looking in the wrong place`]
  }

  return fenceProblems(fences)
}

const REMEDY = 'A fence a reader copies has to compile in the mode their project is in, which the current `sv create` makes runes: declare props with `const { Hst } = $props()`, not `export let Hst` (#1061). `import type { Hst as HstType }` is how the story examples take the type without colliding with the prop (#902).'

export function checkDocsSvelteFences(root = ROOT): CheckResult {
  return { problems: repositoryProblems(root), remedy: REMEDY, notes: [] }
}
