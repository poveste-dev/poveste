// The chunks of a book a consumer builds, read where the smoke test builds one:
// from the packed tarballs, installed by npm outside the workspace.
//
// `scripts/checks/bundle-size.ts` measures `examples/vue`, where every
// `@poveste/*` package is linked source, and `manualChunks` routes linked source
// differently from an install. So the lazy controls sat in a consumer's `vendor`
// for releases while every ceiling there was green (#1343), and the rest of
// Poveste's own code with them (#1695).

import type { Chunk } from '../checks/bundle-size.ts'
import { pathToFileURL } from 'node:url'
import { chunksIn } from '../checks/bundle-size.ts'

/** The controls `@poveste/controls` loads only when a story uses one. */
export const LAZY_CONTROLS = ['HstJson', 'HstDate', 'HstColor']

/**
 * The smoke test's Vue book is one story with one button, so its `vendor` is
 * nearly all the chrome's third-party code. Measured at 459 KB once Poveste's own
 * packages were left out of it (#1695). The window: above 459, and below 633,
 * where a second Vue runtime lands (174 KB, measured with the collapse off and
 * the book's `vue` a patch behind the chrome's). Poveste's own code going back
 * into `vendor` lands at 688. Set at the midpoint, the way `bundle-size.ts` sets
 * its own, so it tolerates 87 KB of drift and catches both.
 *
 * Lowered from 745, which measured a `vendor` still holding Poveste's own code.
 * The lazy controls are held by their chunk names above, not by this number.
 *
 * Unlike that book, this one installs the newest release each range allows, so a
 * dependency's release moves it too. Re-measure both walls before raising it.
 */
export const VENDOR_MAX_KB = 546

const scripts = (chunks: Chunk[]) => chunks.filter(chunk => chunk.name.endsWith('.js'))

export function consumerChunkProblems(chunks: Chunk[]): string[] {
  const js = scripts(chunks)
  const problems = LAZY_CONTROLS
    .filter(control => !js.some(chunk => chunk.name.startsWith(`${control}-`)))
    .map(control => `no \`${control}\` chunk, so the control is bundled into one every reader downloads`)

  const vendor = js.filter(chunk => chunk.name.startsWith('vendor-'))
  if (vendor.length === 0) {
    problems.push(`no \`vendor\` chunk, so its ${VENDOR_MAX_KB} KB ceiling checked nothing`)
  }
  for (const chunk of vendor.filter(chunk => chunk.kb > VENDOR_MAX_KB)) {
    problems.push(`${chunk.name} is ${chunk.kb} KB, over its ${VENDOR_MAX_KB} KB ceiling`)
  }
  return problems
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dir = process.argv[2]
  if (!dir) {
    console.error('usage: consumer-chunks.ts <built book directory>')
    process.exit(2)
  }
  const chunks = scripts(chunksIn(dir))
  for (const chunk of chunks.filter(chunk => chunk.name.startsWith('vendor-') || LAZY_CONTROLS.some(control => chunk.name.startsWith(`${control}-`)))) {
    console.log(`  ${chunk.name} ${chunk.kb} KB`)
  }
  const problems = consumerChunkProblems(chunks)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  process.exit(problems.length ? 1 : 0)
}
