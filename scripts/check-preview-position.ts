// Asserts that the routed view is mounted in exactly one place.
//
// A layout choice must never be expressed as sibling template branches that
// both contain the preview. When it is, flipping that choice moves the preview
// in the component tree, Vue rebuilds it, and the sandbox realm underneath
// boots a cold document — a performance regression with no crash, no wrong
// pixel and no red test. It was found by hand four times: #328, #595, #596 and
// #600, each time believing the previous one had closed it.
//
// What this covers is the `App.vue` layer of that rule: a second `<RouterView>`
// is how #596 and #600 expressed it, and #604 collapsed the chrome branches
// that carried them.
//
// What it does NOT cover is worth stating, because a check that reads as
// broader than it is buys false confidence. #595 lived below the router: its
// fix changed the `<RouterView>` count by zero (3 before, 3 after), and
// `StoryView.vue`, the file carrying the sibling branches, contains no
// `<RouterView>` at all. Catching that shape needs the branch conditions
// classified — per-story properties like `layout.iframe` are safe, live layout
// flags like `isMobile` are not — which needs a real template parse rather than
// this. See #607.
//
// Counting is done on source with comments removed. The comment #604 left in
// `App.vue` explains the bug using the word `RouterView`, so a check that
// greps the bare word fails on a correct tree, tripping over the explanation of
// the thing it is checking.

import { globSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export const APP_SOURCE = 'packages/poveste-app/src'

/**
 * Files permitted a second mount point.
 *
 * Empty, and an entry is expensive: it says a layout choice may move the routed
 * view, which is the regression itself. #607 landed after #604 precisely so
 * this could start empty — an allowlist naming known instances reads as
 * sanctioned rather than as debt.
 */
export const ALLOWLIST: readonly string[] = []

/** Source with HTML, block and line comments removed. */
export function withoutComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, '$1')
}

/** Opening `<RouterView>` / `<router-view>` tags outside comments. */
export function countMountPoints(source: string): number {
  return (withoutComments(source).match(/<(?:RouterView|router-view)[\s/>]/g) ?? []).length
}

export function problemsIn(files: { file: string, source: string }[]): string[] {
  const mounts = files
    .map(({ file, source }) => ({ file, count: countMountPoints(source) }))
    .filter(({ file, count }) => count > 0 && !ALLOWLIST.includes(file))

  const total = mounts.reduce((sum, { count }) => sum + count, 0)
  if (total === 1) {
    return []
  }

  if (total === 0) {
    return ['no <RouterView> found — either it moved, or this check stopped matching']
  }

  return mounts
    .filter(({ count }) => count > 0)
    .map(({ file, count }) => `${file} mounts the routed view ${count} time${count === 1 ? '' : 's'}`)
}

function main(): void {
  const files = globSync(`${APP_SOURCE}/**/*.vue`, { cwd: ROOT })
    .map(file => ({ file, source: readFileSync(join(ROOT, file), 'utf8') }))

  if (files.length === 0) {
    console.error(`::error::no components found under ${APP_SOURCE} — this check is looking in the wrong place`)
    process.exit(1)
  }

  const problems = problemsIn(files)
  if (problems.length > 0) {
    console.error('::error::The routed view is mounted in more than one place\n')
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    console.error('\nTwo mount points means a layout choice can move the preview in the tree,')
    console.error('which rebuilds it and cold-boots the sandbox under it (#328, #596, #600).')
    console.error('See the comment above the split pane in App.vue.')
    process.exit(1)
  }

  console.log(`✅ the routed view is mounted once across ${files.length} components in ${APP_SOURCE}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
