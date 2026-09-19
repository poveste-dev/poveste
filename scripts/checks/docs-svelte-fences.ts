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
// No skip-list. All 51 fences compile today, and a fence that cannot is a fence a
// reader cannot copy — the two cases worth allowing, a deliberate fragment and a
// file that is not a component, are both better written as a different language
// tag than as an exemption here.

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

export function fenceProblems(fences: Fence[]): string[] {
  return fences.flatMap(({ file, index, source }) => {
    try {
      compile(source, { name: 'Fence', generate: 'client' })
      return []
    }
    catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).split('\n')[0]
      return [`${file} fence ${index} does not compile: ${message}`]
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

const REMEDY = 'A fence a reader copies has to compile. `import type { Hst as HstType }` is how the story examples take the type without colliding with the prop (#902).'

export function checkDocsSvelteFences(root = ROOT): CheckResult {
  return { problems: repositoryProblems(root), remedy: REMEDY, notes: [] }
}
