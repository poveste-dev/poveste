// Asserts that the mirrored conformance sets are still copies of each other.
//
// The four conformance books are two authored sets, each mirrored into a second
// host — `examples/nuxt4/histoire.config.ts` says so in its own words. The design
// is deliberate; what was missing is anything keeping the copies copies (#400).
//
// `e2e/story-list.spec.ts` reads `poveste.json` and asserts that every shared id
// carries the expected title. It never looks at what a story contains, so editing
// one of a pair and not the other passes it.
//
// It is not silent — the shared specs bind tightly to story content, so an
// unsynced copy usually goes red. The cost is *where*: you edit vue3, and
// `Example e2e (nuxt4)` fails on a missing locator in a book you did not touch.
// The one thing you need to know — that you changed one of a mirrored pair — is
// exactly what that failure does not carry. And it only holds while a shared spec
// happens to assert the changed part.
//
// A filesystem comparison rather than a Playwright spec: it needs no book built,
// so it runs in `test:scripts` in seconds and fails before the browser jobs start.
//
// `pnpm sync:conformance` rewrites the mirrors from their source.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export interface Mirror {
  /** The authored set. */
  source: string
  /** The copy, kept identical to it. */
  mirror: string
}

export const MIRRORS: Mirror[] = [
  { source: 'examples/vue3/src/conformance', mirror: 'examples/nuxt4/app/components/conformance' },
  { source: 'examples/svelte5/src/conformance', mirror: 'examples/sveltekit/src/lib/conformance' },
]

/**
 * Files allowed to differ, as `<mirror>/<name>`.
 *
 * Intended divergence is a real category rather than an oversight — `I18n` and
 * `BaseButton` diverge on purpose elsewhere in these books — so the mechanism has
 * to name it rather than forbid it. Empty today: every conformance file in both
 * pairs is byte-identical.
 */
export const MIRROR_EXCEPTIONS = new Set<string>([])

export interface MirrorProblem {
  file: string
  reason: 'differs' | 'missing' | 'extra'
}

/**
 * Every file under a conformance directory, nested ones included, as paths
 * relative to it.
 *
 * Top-level only would let a subdirectory through invisibly: a fixture added at
 * `conformance/fixtures/Thing.vue` and imported by a story would leave this
 * check reporting "identical", the sync copying nothing, and the mirrored books
 * failing at build on a missing import — the confusing red in a book you did not
 * touch that this exists to replace.
 */
function filesIn(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        return filesIn(join(dir, entry.name), name)
      }
      return entry.isFile() ? [name] : []
    })
    .sort()
}

export function compareMirror(sourceFiles: Map<string, string>, mirrorFiles: Map<string, string>, exceptions: Set<string> = MIRROR_EXCEPTIONS, mirrorDir = ''): MirrorProblem[] {
  const problems: MirrorProblem[] = []
  const excepted = (name: string) => exceptions.has(mirrorDir ? `${mirrorDir}/${name}` : name)

  for (const [name, content] of sourceFiles) {
    if (excepted(name)) {
      continue
    }
    if (!mirrorFiles.has(name)) {
      problems.push({ file: name, reason: 'missing' })
      continue
    }
    if (mirrorFiles.get(name) !== content) {
      problems.push({ file: name, reason: 'differs' })
    }
  }

  for (const name of mirrorFiles.keys()) {
    if (!sourceFiles.has(name) && !excepted(name)) {
      problems.push({ file: name, reason: 'extra' })
    }
  }

  return problems
}

function read(dir: string): Map<string, string> {
  return new Map(filesIn(join(ROOT, dir)).map(name => [name, readFileSync(join(ROOT, dir, name), 'utf8')]))
}

function main(): void {
  const problems: string[] = []
  let compared = 0

  for (const { source, mirror } of MIRRORS) {
    for (const dir of [source, mirror]) {
      try {
        statSync(join(ROOT, dir))
      }
      catch {
        problems.push(`${dir} does not exist — a mirrored set has moved, and this check no longer describes the tree`)
      }
    }

    const sourceFiles = read(source)
    const mirrorFiles = read(mirror)
    compared += sourceFiles.size

    for (const { file, reason } of compareMirror(sourceFiles, mirrorFiles, MIRROR_EXCEPTIONS, mirror)) {
      if (reason === 'differs') {
        problems.push(`${file} differs between ${source} and ${mirror}`)
      }
      else if (reason === 'missing') {
        problems.push(`${file} is in ${source} but not ${mirror}`)
      }
      else {
        problems.push(`${file} is in ${mirror} but not ${source}`)
      }
    }
  }

  if (problems.length > 0) {
    console.error('❌ Mirrored conformance sets have drifted:\n')
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    console.error('\nRun `pnpm run sync:conformance` to rewrite the mirrors from their source,')
    console.error('or add the file to MIRROR_EXCEPTIONS in scripts/check-mirrored-conformance.ts if it should differ.')
    process.exit(1)
  }

  console.log(`✅ ${compared} conformance stories identical across ${MIRRORS.length} mirrored pairs`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
