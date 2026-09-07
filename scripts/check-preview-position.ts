// Asserts that no layout choice can move the preview in the component tree.
//
// When a choice is expressed as sibling template branches that both contain the
// preview, flipping it moves the preview, Vue rebuilds it, and the sandbox
// realm underneath boots a cold document — a performance regression with no
// crash, no wrong pixel and no red test. Found by hand four times (#328, #595,
// #596, #600), each time believing the previous one had closed it.
//
// The shape alone does not decide it, which is why this parses rather than
// greps. Two sibling groups on `next` are legitimate: `StoryViewer` switches
// grid against single, and `StoryVariantSingleView` native against remote.
// Both put the preview in more than one branch, and both are fine, because
// their conditions are properties of the story being shown — they cannot flip
// while the story is stationary, and a story change rebuilds anyway.
//
// So the rule is about the condition, not the branches: a group with the
// preview in more than one branch fails unless every condition is stable under
// a stationary story. Unclassified fails, which is the direction that matters —
// `isMobile` (#600) and the settings toggles (#596) were both live flags nobody
// had thought about.

import { globSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse } from '@vue/compiler-sfc'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export const APP_SOURCE = 'packages/poveste-app/src'

/** Components that are the preview, rather than merely containing it. */
export const PREVIEW_ROOTS = [
  'RouterView',
  'router-view',
  'StoryVariantSinglePreviewNative',
  'StoryVariantSinglePreviewRemote',
  'GenericRenderStory',
]

/**
 * Conditions that cannot change while the story does not.
 *
 * A skip-list, not an allowlist of files: a condition nobody has classified
 * fails, so the next `isMobile` is caught because it is unknown rather than
 * because someone remembered to list it. An entry is a claim that flipping this
 * requires a story change — which rebuilds the preview anyway — and is wrong
 * only in the direction of a silent regression, so it earns a reason.
 */
export const STABLE = [
  // Properties of the story being shown.
  /\bcurrentStory\b/,
  /\bcurrentVariant\b/,
  /\bdocsOnly\b/,
  /\.layout\b/,
  /\.story\b/,
  /\bvariant\b/,
  // `StoryVariantGridItem`: reads `story.layout.iframeGrid`, falling back to
  // `povesteConfig.isolateStyles`, which is fixed for the session.
  /\buseIframe\b/,
]

interface Branch { tag: string, condition: string | null }

export function isStable(condition: string | null): boolean {
  // `v-else` states no condition; it inherits the negation of its siblings.
  if (condition === null) return true
  return STABLE.some(marker => marker.test(condition))
}

/** Sibling `v-if` / `v-else-if` / `v-else` runs, with the tags each branch contains. */
export function groupsIn(source: string): { branches: Branch[], tags: Set<string>[] }[] {
  const { descriptor } = parse(source)
  const found: { branches: Branch[], tags: Set<string>[] }[] = []

  const tagsUnder = (node: any, into: Set<string>): Set<string> => {
    for (const child of node.children ?? []) {
      if (child.type !== 1) continue
      into.add(child.tag)
      tagsUnder(child, into)
    }
    return into
  }

  const walk = (node: any): void => {
    let open: { branches: Branch[], tags: Set<string>[] } | null = null
    for (const child of (node?.children ?? []).filter((c: any) => c.type === 1)) {
      const directive = (child.props ?? []).find((p: any) =>
        p.type === 7 && ['if', 'else-if', 'else'].includes(p.name))

      if (directive?.name === 'if') {
        open = { branches: [], tags: [] }
        found.push(open)
      }
      else if (!directive) {
        open = null
      }

      if (directive && open) {
        open.branches.push({ tag: child.tag, condition: directive.exp?.content ?? null })
        open.tags.push(tagsUnder(child, new Set([child.tag])))
      }

      walk(child)
    }
  }

  walk(descriptor.template?.ast)
  return found
}

/** Components that render the preview, directly or through another component. */
export function previewReaching(files: { file: string, source: string }[]): Set<string> {
  const uses = new Map<string, Set<string>>()
  for (const { file, source } of files) {
    const name = file.split('/').pop()!.replace(/\.vue$/, '')
    const tags = new Set<string>()
    const collect = (node: any): void => {
      for (const child of node?.children ?? []) {
        if (child.type !== 1) continue
        tags.add(child.tag)
        collect(child)
      }
    }
    collect(parse(source).descriptor.template?.ast)
    uses.set(name, tags)
  }

  const reaching = new Set(PREVIEW_ROOTS)
  for (let changed = true; changed;) {
    changed = false
    for (const [name, tags] of uses) {
      if (reaching.has(name)) continue
      if ([...tags].some(tag => reaching.has(tag))) {
        reaching.add(name)
        changed = true
      }
    }
  }
  return reaching
}

export function problemsIn(files: { file: string, source: string }[]): string[] {
  const reaching = previewReaching(files)
  const problems: string[] = []

  for (const { file, source } of files) {
    for (const group of groupsIn(source)) {
      if (group.branches.length < 2) continue

      const carrying = group.tags.filter(tags => [...tags].some(tag => reaching.has(tag)))
      if (carrying.length < 2) continue

      const unstable = group.branches.filter(branch => !isStable(branch.condition))
      if (unstable.length === 0) continue

      const conditions = unstable.map(branch => `\`${branch.condition}\``).join(', ')
      problems.push(
        `${file}: ${carrying.length} branches of one group render the preview, `
        + `switched on ${conditions}`,
      )
    }
  }

  return problems
}

function main(): void {
  const files = globSync(`${APP_SOURCE}/**/*.vue`, { cwd: ROOT })
    .map(file => ({ file, source: readFileSync(join(ROOT, file), 'utf8') }))

  if (files.length === 0) {
    console.error(`::error::no components found under ${APP_SOURCE} — this check is looking in the wrong place`)
    process.exit(1)
  }

  const reaching = previewReaching(files)
  if (reaching.size <= PREVIEW_ROOTS.length) {
    console.error('::error::nothing reaches the preview — this check stopped matching')
    process.exit(1)
  }

  const problems = problemsIn(files)
  if (problems.length > 0) {
    console.error('::error::A layout choice can move the preview in the component tree\n')
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    console.error('\nMoving the preview rebuilds it and cold-boots the sandbox under it')
    console.error('(#328, #595, #596, #600). Hoist it above the branches, or — if the')
    console.error('condition really cannot flip while the story is stationary — add it')
    console.error('to STABLE in scripts/check-preview-position.ts with the reason.')
    process.exit(1)
  }

  console.log(`✅ no layout choice moves the preview across ${files.length} components in ${APP_SOURCE}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
