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
  { source: 'examples/vue3/src/conformance', mirror: 'examples/quasar/src/conformance' },
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
interface Selection {
  files: string[]
  /**
   * How many files the directory held, counted from the dirent and not from
   * the selection below it.
   *
   * Deliberately a second, independent count. Anything derived from the same
   * expression that decides what to keep agrees with it by construction, and
   * would agree just as readily when that expression is wrong.
   */
  offered: number
}

function filesIn(dir: string, prefix = ''): Selection {
  const files: string[] = []
  let offered = 0

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      const nested = filesIn(join(dir, entry.name), name)
      files.push(...nested.files)
      offered += nested.offered
      continue
    }

    if (entry.isFile()) {
      offered++
      files.push(name)
    }
  }

  return { files: files.sort(), offered }
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

export interface Pair extends Mirror {
  sourceFiles: Map<string, string>
  mirrorFiles: Map<string, string>
  /** This pair's directories that are not on disk. */
  missing: string[]
  /** Files opened for this pair, as `<dir>/<name>`. */
  examined: string[]
  /** How many files this pair's two directories held, compared or not. */
  offered: number
}

export interface Walk {
  pairs: Pair[]
}

/**
 * The half that finds and opens files, split from the half that judges them so
 * that a spec can point it at a fixture tree and assert what it read (#719).
 *
 * `root` and `mirrors` are parameters with the real values as defaults, so
 * every existing caller is unchanged and nothing new runs on import — the
 * import guard's guarantee is what it was (#388).
 */
export function collect(root = ROOT, mirrors: Mirror[] = MIRRORS): Walk {
  const pairs: Pair[] = []

  for (const { source, mirror } of mirrors) {
    const missing: string[] = []
    const examined: string[] = []
    let offered = 0

    const read = (dir: string): Map<string, string> => {
      try {
        statSync(join(root, dir))
      }
      catch {
        missing.push(dir)
        return new Map()
      }
      const selection = filesIn(join(root, dir))
      offered += selection.offered
      examined.push(...selection.files.map(name => `${dir}/${name}`))
      return new Map(selection.files.map(name => [name, readFileSync(join(root, dir, name), 'utf8')]))
    }

    pairs.push({ source, mirror, sourceFiles: read(source), mirrorFiles: read(mirror), missing, examined, offered })
  }

  return { pairs }
}

/**
 * What the walk has to be able to say about itself before anything trusts it.
 *
 * Both assertions are **per pair**, because `MIRRORS` has three entries and an
 * aggregate hides two thirds of this check. If the svelte5 pair went empty, the
 * two vue3 pairs would keep any aggregate well clear of zero and the success
 * line would report a count missing a whole framework — the floor silent for
 * exactly the failure it was written for, one pair down instead of three.
 *
 * Reach — a pair whose directories both exist and hold no file has stopped
 * reaching its conformance set.
 *
 * Coverage — "it examined something" is satisfied by any one file, so it is
 * not enough on its own — narrowing the selection to one extension took this
 * check from 75 files compared to 36, at exit 0, with every other assertion
 * green. So every file a pair holds must be compared. `filesIn` counts what was
 * offered from the dirent rather than from the expression that decides what to
 * keep: a count derived from that expression agrees with it by construction,
 * including when it is wrong. It is a second measurement taken in the same run,
 * not a baseline anyone has to maintain against a set that grows.
 *
 * What neither catches is a selection narrowed *and* a counter moved with it.
 * Nothing inside one function defends against that.
 *
 * The pair's directories are checked for existence first and reported by name,
 * because a moved directory is a different fault with a different fix.
 */
export function walkProblems({ pairs }: Walk): string[] {
  const problems: string[] = []

  for (const { source, mirror, missing, examined, offered } of pairs) {
    if (missing.length > 0) {
      problems.push(...missing.map(dir => `${dir} does not exist — a mirrored set has moved, and this check no longer describes the tree`))
      continue
    }

    if (examined.length === 0) {
      problems.push(`${source} and ${mirror} both exist and neither holds a file — this pair has stopped reaching its conformance set`)
      continue
    }

    if (examined.length !== offered) {
      problems.push(`${source} and ${mirror} hold ${offered} files and the walk compared ${examined.length} of them — the rest left the comparison without saying so`)
    }
  }

  return problems
}

function main(): void {
  const walk = collect()
  const problems: string[] = walkProblems(walk)
  let compared = 0

  for (const { source, mirror, sourceFiles, mirrorFiles } of walk.pairs) {
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
