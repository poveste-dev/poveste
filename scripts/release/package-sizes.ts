// What each published package weighs as a consumer downloads it, a PR's base
// against its head, for the comment `package-size.yml` keeps on every PR (#988).
//
// The size is the packed tarball: what `pnpm pack` writes, which is what
// `pnpm publish` uploads and npm downloads. The registry reports `unpackedSize`
// but nothing for the tarball, so a size read there would be a different number.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
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
  else {
    console.error('usage: package-sizes.ts measure <built checkout> <out.json>\n       package-sizes.ts table <base.json> <head.json> <base label>')
    process.exit(2)
  }
}
