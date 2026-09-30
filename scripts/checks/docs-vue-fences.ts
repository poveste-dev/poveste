// Compiles every ```vue fence in `docs/`, the way #919 does for Svelte, because
// a fence is prose to every other check we run and to VitePress, which renders it
// whether or not it means anything (#902).
//
// The Vue side was already clean when this landed — 62 fences, all compiling,
// including the `markRaw` example added this cycle. So this is a guard against a
// defect rather than a fix for one, which is the opposite of #919 and worth
// saying: the Svelte fences were broken in 15 places before anything looked.
//
// The compiler rather than a pattern, for #919's reason: the defect is "this does
// not compile", and a rule matching one spelling passes the next one.
//
// `compileScript` and not `parse` alone. Parsing splits an SFC into blocks and is
// happy with a `<script setup>` whose contents are nonsense; the macros, the
// bindings and the type-only imports are resolved in `compileScript`, which is
// where #919's defect would have surfaced. A parse-only check would have passed
// all fifteen of them.
//
// Verifying this check needs a break planted in macro position. A
// `defineProps<Unresolvable>()` nested inside a `reactive({ … })` literal is not
// a macro, so it compiles and the run stays green — which reads as the fence
// being covered when it proves nothing. Plant it at the top level of the
// `<script setup>` instead.
//
// A fence with no `<script>` is still compiled as far as it goes: a `<template>`
// on its own is a valid component and most of the reference pages are exactly
// that. Only a fence that is neither is rejected, which is what a bare element
// fragment is.
//
// No skip-list. The two cases worth allowing, a deliberate fragment and a file
// that is not a component, are both better written as a different language tag
// than as an exemption here — so the three fragments that used to fail are now
// ```vue-html, which Shiki highlights with its `template` grammar.

import type { CheckResult } from './support/check-result.ts'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc'

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
  // `vue{6-9}` is the same fence with VitePress line highlighting, so the opener
  // is not always followed by a newline. `(?![\w-])` is what keeps ```vue-html
  // out — without it this check would claim the fragments it exists to exclude.
  return [...markdown.matchAll(/```vue(?![\w-])[^\n]*\n([\s\S]*?)```/g)]
    .map((match, index) => ({ file, index: index + 1, source: match[1] ?? '' }))
}

export function fenceProblems(fences: Fence[]): string[] {
  return fences.flatMap(({ file, index, source }) => {
    const fail = (message: string) => [`${file} fence ${index} does not compile: ${message.split('\n')[0]}`]

    try {
      const { descriptor, errors } = parse(source, { filename: 'Fence.vue' })
      if (errors.length > 0) {
        return fail(errors[0]?.message ?? 'could not be parsed')
      }

      if (descriptor.script || descriptor.scriptSetup) {
        compileScript(descriptor, { id: 'fence' })
      }
      else if (!descriptor.template) {
        return fail('neither a `<template>` nor a `<script>`, so it is a fragment rather than a component')
      }

      return []
    }
    catch (error) {
      return fail(error instanceof Error ? error.message : String(error))
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
    return [`no \`vue\` fence under ${DOCS} — this check is looking in the wrong place`]
  }

  return fenceProblems(fences)
}

const REMEDY = 'A fence a reader copies has to compile. A deliberate template fragment belongs in a ```vue-html fence, which Shiki still highlights, rather than in an exemption here.'

export function checkDocsVueFences(root = ROOT): CheckResult {
  return { problems: repositoryProblems(root), remedy: REMEDY, notes: [] }
}
