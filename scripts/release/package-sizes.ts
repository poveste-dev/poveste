// What each published package weighs as a consumer downloads it, a PR's base
// against its head, for the comment `package-size.yml` keeps on every PR (#988).
//
// The size is the packed tarball: what `pnpm pack` writes, which is what
// `pnpm publish` uploads and npm downloads. The registry reports `unpackedSize`
// but nothing for the tarball, so a size read there would be a different number.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export type Sizes = Record<string, number>

/** Every package under `packages/` that is not private, read from its manifest rather than listed here. */
export function publishedPackages(root: string): { dir: string, name: string }[] {
  const packages = join(root, 'packages')
  return readdirSync(packages, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap((entry) => {
      const dir = join(packages, entry.name)
      let manifest: { name?: string, private?: boolean }
      try {
        manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      }
      catch {
        return []
      }
      return manifest.name && !manifest.private ? [{ dir, name: manifest.name }] : []
    })
}

/** Packs each published package of a built checkout and returns its tarball's bytes. */
export function measure(root: string): Sizes {
  const out = mkdtempSync(join(tmpdir(), 'poveste-package-sizes-'))
  const sizes: Sizes = {}
  for (const { dir, name } of publishedPackages(root)) {
    const packed = JSON.parse(execFileSync('pnpm', ['pack', '--json', '--pack-destination', out], { cwd: dir, encoding: 'utf8' })) as { filename: string }
    sizes[name] = statSync(packed.filename).size
  }
  return sizes
}

/**
 * The most each package's tarball may weigh, and the regression it is there to
 * catch (#988). Each is the midpoint between 0.20.0 plus 0.21's planned growth and
 * 0.20.0 plus the package's own tests, rounded to 100 B; where those are under 2 kB
 * apart, 0.20.0 plus 1 kB. The derivation is on #988. Raise one only from a fresh
 * measurement, saying in the PR what grew and why, as `bundle-size.ts` asks of its own.
 * A ceiling with no bytes is a note, read but not enforced.
 */
export const CEILINGS: Record<string, { bytes?: number, reason: string }> = {
  'poveste': { bytes: 141_900, reason: 'room for the JSX walker and shared docgen 0.21 adds; catches its tests shipping, or a dependency of their size bundled' },
  // Raised from 435_300 for #1436's table: v-model marks, type parameters and slot-prop
  // rows, 1,688 B together over 0.21's `next` at 435,001 (#1473, #1474, #1475).
  // Raised from 437_000 for #1521: the source panel's grammar chosen per story file,
  // 385 B over 0.21's `next` at 436,880.
  '@poveste/app': { bytes: 437_700, reason: 'ships `src` beside `dist` on purpose, so a test file escaping the `files` exclusion lands here' },
  '@poveste/controls': { bytes: 241_200, reason: 'the lazy controls carry CodeMirror; catches a second copy, and the tests' },
  // Raised from 63_900 for #942's story tests: the `testing` entry and its Vite plugin,
  // 9,654 B over 0.21's `next` at 61,469, counted twice because `src` ships beside `dist`.
  // Raised from 71_900 for #1503: the story tests' inlining and pre-bundling, 1,010 B
  // over the 0.21 pass's pin at 71,193.
  // Raised from 72_700 for #1464: its checker built on its own TypeScript 6, 807 B over
  // 0.22's `next` at 72,655.
  '@poveste/plugin-vue': { bytes: 73_600, reason: 'ships `src` too; catches the tests, and `vue-component-meta` bundled instead of depended on' },
  '@poveste/plugin-svelte': { bytes: 44_100, reason: 'room for the `svelte2tsx` host; catches the tests, and `svelte2tsx` bundled instead of depended on' },
  '@poveste/shared': { bytes: 26_100, reason: 'types and a small runtime; catches the tests' },
  '@poveste/plugin-nuxt': { bytes: 11_700, reason: 'catches the tests' },
  // 0.21's growth here was inferred from Solid's before React's auto-docs (#1161) had a
  // PR; enforce it once that has merged and the number is measured again.
  '@poveste/plugin-react': { reason: 'proposed 10,800 B, from an inferred growth: re-measure once React auto-docs has merged' },
  '@poveste/plugin-solid': { bytes: 10_200, reason: 'room for the JSX extractor glue; catches the tests' },
  '@poveste/plugin-quasar': { bytes: 7_700, reason: 'catches the tests' },
  '@poveste/plugin-tailwind': { bytes: 9_900, reason: '0.20.0 plus 1 kB; catches the tests' },
  '@poveste/plugin-percy': { bytes: 5_900, reason: '0.20.0 plus 1 kB; catches the tests' },
  '@poveste/plugin-screenshot': { bytes: 4_400, reason: '0.20.0 plus 1 kB; catches source maps or a bundled dependency, not its 600 B of tests' },
  // Stubs only: what a book gets from it is scavenged at build time (#305). Its shape
  // moved in #347 and #935, so a PR that reshapes it re-derives this on purpose.
  '@poveste/vendors': { bytes: 4_000, reason: 'catches bundled copies shipping again, as they did up to 0.15.0 (846 kB)' },
}

/** Each package over its ceiling, and each published package with none, as a sentence naming it. */
export function overCeilings(sizes: Sizes, ceilings = CEILINGS): string[] {
  return Object.entries(sizes).sort(([a], [b]) => a.localeCompare(b)).flatMap(([name, bytes]) => {
    const ceiling = ceilings[name]
    if (!ceiling) {
      return [`\`${name}\` has no ceiling in scripts/release/package-sizes.ts. Add one with the regression it catches.`]
    }
    if (ceiling.bytes !== undefined && bytes > ceiling.bytes) {
      return [`\`${name}\` packs to ${bytes} B, over its ceiling of ${ceiling.bytes} B (${ceiling.reason}).`]
    }
    return []
  })
}

/**
 * The tarballs `pnpm pack` already wrote into `dir`, as `smoke-test.sh` packs them,
 * so the release gate weighs what it installs rather than packing a second time.
 * A published package the smoke test does not pack, as it exempts the screenshot
 * plugin, comes back in `unpacked`: the package-size check weighs it on every PR.
 */
export function tarballSizes(root: string, dir: string): { sizes: Sizes, unpacked: string[] } {
  const sizes: Sizes = {}
  const unpacked: string[] = []
  for (const { dir: packageDir, name } of publishedPackages(root)) {
    const { version } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as { version: string }
    const tarball = join(dir, `${name.replace(/^@/, '').replace('/', '-')}-${version}.tgz`)
    if (existsSync(tarball)) {
      sizes[name] = statSync(tarball).size
    }
    else {
      unpacked.push(name)
    }
  }
  return { sizes, unpacked }
}

function kb(bytes: number): string {
  return `${(bytes / 1000).toFixed(1)} kB`
}

/** A change under 1 kB in bytes, because a few bytes printed as `−0.0 kB` reads as nothing at all. */
export function formatDiff(diff: number): string {
  if (diff === 0) {
    return '0'
  }
  const sign = diff > 0 ? '+' : '−'
  return Math.abs(diff) < 1000 ? `${sign}${Math.abs(diff)} B` : `${sign}${kb(Math.abs(diff))}`
}

export function formatPercent(base: number, diff: number): string {
  if (diff === 0) {
    return '0%'
  }
  const percent = (diff / base) * 100
  return `${percent > 0 ? '+' : '−'}${Math.abs(percent).toFixed(2)}%`
}

export const MARKER = '<!-- poveste:package-size -->'

/** The comment's body: one row per package in either checkout, then the total. */
export function sizeTable(base: Sizes, head: Sizes, baseLabel: string): string {
  const names = [...new Set([...Object.keys(base), ...Object.keys(head)])].sort()
  const rows = names.map((name) => {
    const before = base[name]
    const after = head[name]
    if (before === undefined) {
      return `| \`${name}\` | — | ${kb(after!)} | new | |`
    }
    if (after === undefined) {
      return `| \`${name}\` | ${kb(before)} | — | removed | |`
    }
    return `| \`${name}\` | ${kb(before)} | ${kb(after)} | ${formatDiff(after - before)} | ${formatPercent(before, after - before)} |`
  })

  const baseTotal = Object.values(base).reduce((sum, bytes) => sum + bytes, 0)
  const headTotal = Object.values(head).reduce((sum, bytes) => sum + bytes, 0)
  const totalDiff = headTotal - baseTotal

  return [
    MARKER,
    '### Package sizes',
    '',
    `Each published package's packed tarball, \`${baseLabel}\` against this PR.`,
    '',
    `| package | \`${baseLabel}\` | this PR | diff | % |`,
    '| --- | ---: | ---: | ---: | ---: |',
    ...rows,
    `| **total** | **${kb(baseTotal)}** | **${kb(headTotal)}** | **${formatDiff(totalDiff)}** | **${formatPercent(baseTotal, totalDiff)}** |`,
    '',
  ].join('\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [command, ...args] = process.argv.slice(2)
  if (command === 'measure' && args.length === 2) {
    writeFileSync(args[1]!, `${JSON.stringify(measure(args[0]!), null, 2)}\n`)
  }
  else if (command === 'table' && args.length === 3) {
    const read = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Sizes
    process.stdout.write(sizeTable(read(args[0]!), read(args[1]!), args[2]!))
  }
  else if ((command === 'check' && args.length === 1) || (command === 'check-tarballs' && args.length === 2)) {
    const { sizes, unpacked } = command === 'check'
      ? { sizes: JSON.parse(readFileSync(args[0]!, 'utf8')) as Sizes, unpacked: [] }
      : tarballSizes(args[0]!, args[1]!)
    for (const name of unpacked) {
      console.log(`· ${name} is not packed here; the package-size check weighs it on every PR.`)
    }
    const problems = overCeilings(sizes)
    for (const problem of problems) {
      console.error(`✗ ${problem}`)
    }
    if (problems.length) {
      process.exit(1)
    }
    console.log(`✓ Every package is within its ceiling (${Object.keys(sizes).length} packed).`)
  }
  else {
    console.error('usage: package-sizes.ts measure <built checkout> <out.json>\n       package-sizes.ts table <base.json> <head.json> <base label>\n       package-sizes.ts check <sizes.json>\n       package-sizes.ts check-tarballs <checkout> <tarball dir>')
    process.exit(2)
  }
}
