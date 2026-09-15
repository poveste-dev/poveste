// Release preflight: every non-private workspace package must exist on the
// registry (OIDC cannot bootstrap a first publish), pack with no unrewritten
// `workspace:` protocol, and resolve every advertised entrypoint. A partial
// publish cannot be walked back (#286, #302). `--offline` drops the registry
// lookup, the only networked check. Needs each package built.

import type { CheckResult } from './support/check-result.ts'
import { execFileSync } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DEP_KEYS = ['dependencies', 'peerDependencies', 'optionalDependencies']

// Published only so the workspace can depend on them, and consumed through
// bundler resolution alone; their resolution defects predate #302 and are #312.
const BUNDLER_ONLY_PACKAGES = new Set([
  '@poveste/app',
  '@poveste/controls',
  '@poveste/vendors',
])

interface Pkg {
  name: string
  dir: string
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

export interface Skipped {
  dir: string
  reason: string
}

export interface Walk {
  packages: Pkg[]
  /** Every entry under `packages/` the walk did not select, and why. */
  skipped: Skipped[]
  /** Everything `packages/` held, selected or not. */
  entries: string[]
}

/**
 * The walk, split from the checks that judge what it finds so a spec can point
 * it at a fixture tree (#719).
 *
 * It reports what it *rejected* as well as what it kept, because the failure
 * worth catching here is partial. Four checks read this one list, and a filter
 * that quietly stops selecting a package leaves two of them green over a
 * package they no longer examine — `checks/package-tests` and
 * `checks/doc-coverage` both exit 0 with one package missing from the list.
 */
export function walkPackages(root = ROOT): Walk {
  const packages: Pkg[] = []
  const skipped: Skipped[] = []
  const entries = readdirSync(join(root, 'packages'))

  for (const entry of entries) {
    const dir = join(root, 'packages', entry)
    let manifest: any
    try {
      manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    }
    catch {
      skipped.push({ dir: entry, reason: 'no readable package.json' })
      continue
    }
    if (!manifest.name) {
      skipped.push({ dir: entry, reason: 'its manifest declares no name' })
      continue
    }
    if (manifest.private) {
      skipped.push({ dir: entry, reason: 'private' })
      continue
    }
    packages.push({ name: manifest.name, dir })
  }

  return { packages: packages.sort((a, b) => a.name.localeCompare(b.name)), skipped, entries }
}

/**
 * `--root <path>` aims `checks/changelog.ts` at a fixture tree. It is the one check
 * still run as a process, so its spec can only reach a tree through its argv.
 */
export function rootFromArgv(argv: string[]): string | undefined {
  const at = argv.indexOf('--root')
  return at === -1 ? undefined : argv[at + 1]
}

export function publishablePackages(root = ROOT): Pkg[] {
  return walkPackages(root).packages
}

/**
 * What the walk has to be able to say about itself before anything trusts it.
 *
 * "It examined at least one thing" is the floor and is not enough on its own: a
 * walk that stops selecting *one* package passes it, and four checks read this
 * list, so a package leaving it quietly is what none of them survives.
 *
 * **The accounting cannot fire against the walk as written** — every path above
 * either selects or records a skip, so the counts agree by construction. It is
 * a tripwire for the next filter somebody adds, not evidence that this walk is
 * complete. A green accounting check proves nothing about today; it fails the
 * day an entry starts falling through.
 *
 * **It covers one half of partial loss.** An entry that drops out entirely
 * fails here. An entry *misclassified* — recorded as skipped, with a reason
 * that is not true of it — passes, and no count can catch that, because any
 * count derived from the same classification moves with it. Only an independent
 * list of what should be there catches a misclassification, which is what
 * `packageTableProblems` is and why this check survives one while
 * `checks/package-tests`, reading the same walk, does not.
 */
export function walkProblems({ packages, skipped, entries }: Walk): string[] {
  if (entries.length === 0) {
    return ['packages/ held nothing to walk — this check no longer describes the tree']
  }

  const problems: string[] = []

  if (packages.length === 0) {
    problems.push(`packages/ held ${entries.length} entries and the walk selected none of them as publishable`)
  }

  const accounted = packages.length + skipped.length
  if (accounted !== entries.length) {
    problems.push(`the walk accounted for ${accounted} of ${entries.length} entries under packages/ — the rest were neither selected nor skipped for a reason, so they left the list without saying so`)
  }

  return problems
}

/**
 * CONTRIBUTING's package table is the only place in the repo that states what
 * the published surface is, so anything wanting that list has to use it or
 * restate it. It listed a private package and omitted a published one, and the
 * count still read twelve, which is why nothing looked off (#510).
 *
 * `published` is every non-private package; `listed` is what the table names.
 */
export function packageTableProblems(markdown: string, published: string[], all: string[]): string[] {
  const listed = [...markdown.matchAll(/^\|\s*\[(@?[\w./-]+)\]\(\.\/packages\//gm)].map(match => match[1])
  if (listed.length === 0) {
    return ['CONTRIBUTING.md has no package table to read — the shape this check reads has changed']
  }

  const problems: string[] = []
  const notPublished = new Set(all.filter(name => !published.includes(name)))

  for (const name of published) {
    if (!listed.includes(name)) {
      problems.push(`CONTRIBUTING.md's package table omits ${name}, which is published`)
    }
  }

  for (const name of listed) {
    if (!all.includes(name)) {
      problems.push(`CONTRIBUTING.md's package table lists ${name}, which is not a package in this repo`)
      continue
    }
    // A private package may be listed — a contributor still meets it — but the
    // table must not imply it ships.
    const row = markdown.split('\n').find(line => line.includes(`[${name}](./packages/`)) ?? ''
    if (notPublished.has(name) && !/not published/i.test(row)) {
      problems.push(`CONTRIBUTING.md's package table lists ${name} without marking it "not published"`)
    }
  }

  return problems
}

// `true` if the package exists on the registry, else the reason it does not.
export function registryStatus(name: string): true | string {
  let lastError = ''
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execFileSync('npm', ['view', name, 'version'], { stdio: ['ignore', 'ignore', 'pipe'] })
      return true
    }
    catch (err: any) {
      const stderr = String(err.stderr ?? '')
      if (/E404|404 Not Found/.test(stderr)) {
        return 'has never been published, so Trusted Publishing cannot bootstrap it — publish it once by hand, then configure its Trusted Publisher on npmjs.com'
      }
      // A network/registry blip is not proof the package exists; retry before
      // failing, so one hiccup does not block a whole release.
      lastError = stderr.split('\n')[0]?.trim() || err.message
      if (attempt < 3) {
        sleepSync(attempt * 1000)
      }
    }
  }
  return `could not be verified on the registry after 3 attempts: ${lastError}`
}

// Dependencies the manifest still expresses with pnpm's `workspace:` protocol,
// which npm cannot install. Pure so it can be tested without packing.
export function workspaceProtocolDeps(manifest: any): string[] {
  const offenders: string[] = []
  for (const key of DEP_KEYS) {
    for (const [dep, range] of Object.entries(manifest[key] ?? {})) {
      if (typeof range === 'string' && range.startsWith('workspace:')) {
        offenders.push(`${key}.${dep} = ${range}`)
      }
    }
  }
  return offenders
}

// Scripts ignored: dist is already built, and prepack would rebuild the graph.
// The caller removes `dest`.
function packPackage(pkg: Pkg): { dest: string, tarball: string } {
  const dest = mkdtempSync(join(tmpdir(), 'poveste-pack-'))
  try {
    execFileSync('pnpm', ['pack', '--pack-destination', dest, '--config.ignore-scripts=true'], {
      cwd: pkg.dir,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    const tarball = readdirSync(dest).find(file => file.endsWith('.tgz'))
    if (!tarball) {
      throw new Error('pnpm pack produced no tarball')
    }
    return { dest, tarball: join(dest, tarball) }
  }
  catch (err) {
    // Nothing is returned, so nothing else can clean this up.
    rmSync(dest, { recursive: true, force: true })
    throw err
  }
}

function packedManifest(tarball: string): any {
  return JSON.parse(
    String(execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], { stdio: ['ignore', 'pipe', 'pipe'] })),
  )
}

function packedPaths(tarball: string): string[] {
  return String(execFileSync('tar', ['-tzf', tarball], { stdio: ['ignore', 'pipe', 'pipe'] }))
    .split('\n')
    .filter(path => path && !path.endsWith('/'))
    .map(path => path.replace(/^package\//, ''))
}

// npm ships these whatever `files` says. Deliberately not the `main` file,
// which npm also forces in: a main outside the declared surface is a defect.
const ALWAYS_PACKED = /^(?:package\.json|readme|licen[cs]e)(?:\.[^/]*)?$/i

// Packed paths no `files` entry accounts for. Entries match as an exact path or
// a directory prefix, which is all this repo declares; a glob would be reported
// here rather than quietly accepted (#300).
export function undeclaredPackedPaths(paths: string[], files: string[]): string[] {
  const { include } = parseEntries(files)
  return paths.filter(path =>
    !ALWAYS_PACKED.test(path)
    && !include.some(entry => covers(entry, path)))
}

// `files` entries that shipped nothing — a renamed or mistyped directory. The
// package then publishes without it, which no entrypoint check would notice
// when the path is loaded at runtime rather than imported (#300).
export function emptyFilesEntries(paths: string[], files: string[]): string[] {
  const { include } = parseEntries(files)
  return include.filter(entry => !paths.some(path => covers(entry, path)))
}

// Entry forms this matcher cannot judge. A positive glob would make every path
// it covers look undeclared, so say so instead of reporting nonsense.
export function unsupportedFilesEntries(files: string[]): string[] {
  return parseEntries(files).unsupported
}

// `!` entries only subtract, so they never grant coverage and are never
// expected to ship anything of their own.
function parseEntries(files: string[]): { include: string[], unsupported: string[] } {
  const include: string[] = []
  const unsupported: string[] = []
  for (const raw of files) {
    if (raw.startsWith('!')) {
      continue
    }
    const entry = raw.replace(/^\.\//, '').replace(/\/$/, '')
    if (/[*?[\]]/.test(entry)) {
      unsupported.push(raw)
    }
    else {
      include.push(entry)
    }
  }
  return { include, unsupported }
}

function covers(entry: string, path: string): boolean {
  return path === entry || path.startsWith(`${entry}/`)
}

// One entry per `attw` problem, keyed by problem kind.
type AttwProblems = Record<string, Array<{ kind: string, entrypoint?: string, resolutionKind?: string }>>

// Accepted: CJSResolvesToESM (the packages are ESM-only), and NoResolution on a
// `*-dev` entrypoint (TypeScript source, resolved only under POVESTE_DEV).
export function unacceptedResolutionProblems(problems: AttwProblems): string[] {
  const offenders: string[] = []
  for (const list of Object.values(problems ?? {})) {
    for (const problem of list ?? []) {
      if (problem.kind === 'CJSResolvesToESM') {
        continue
      }
      if (problem.kind === 'NoResolution' && (problem.entrypoint ?? '').endsWith('-dev')) {
        continue
      }
      offenders.push(`${problem.entrypoint ?? '(package)'} — ${problem.kind} under ${problem.resolutionKind ?? 'an unknown mode'}`)
    }
  }
  return offenders
}

function entrypointResolutionProblems(tarball: string, dest: string): string[] {
  // A file, not a pipe: attw exits non-zero when it reports problems, and Node
  // caps a failed process's stdout at 64KB, truncating larger reports mid-JSON.
  const jsonPath = join(dest, 'attw.json')
  const fd = openSync(jsonPath, 'w')
  let runError: unknown
  try {
    execFileSync('attw', ['--format', 'json', tarball], { stdio: ['ignore', fd, 'pipe'] })
  }
  catch (err) {
    runError = err
  }
  finally {
    closeSync(fd)
  }
  const output = readFileSync(jsonPath, 'utf8')
  // No output means attw never ran, not that the package is clean.
  if (!output) {
    throw runError ?? new Error('attw produced no output')
  }

  const problems = JSON.parse(output).problems
  // A non-zero exit means attw had findings, so nothing under `problems` means
  // the shape moved. Refusing beats reporting the package clean.
  if (runError && !Object.keys(problems ?? {}).length) {
    throw new Error(`attw exited non-zero but reported no problems under \`problems\` — its output shape has probably changed: ${output.slice(0, 200)}`)
  }
  return unacceptedResolutionProblems(problems)
}

// execFileSync's message is only `Command failed: <argv>`; the reason is on stderr.
function describeError(err: any): string {
  const stderr = String(err.stderr ?? '').trim()
  return stderr ? `${err.message} — ${stderr}` : err.message
}

function repositoryProblems(root: string, { offline = false }: { offline?: boolean }): string[] {
  const packagesDir = join(root, 'packages')
  const walk = walkPackages(root)
  const packages = walk.packages

  // A second walk of the same directory, deliberately, and not duplication of
  // `walk.entries`: it reads every manifest's name whatever `walkPackages`
  // decided about it, so the CONTRIBUTING table below is compared against a
  // list that does not come from the classification it is checking.
  //
  // That independence is load-bearing. Marking a real package private passes
  // the accounting in `walkProblems` and leaves `checks/package-tests` and
  // `checks/doc-coverage` green; this is the only thing in the four checks that
  // catches it. Folding it into the walk above would make both lists agree by
  // construction and take that with it.
  const allNames: string[] = []
  for (const entry of readdirSync(packagesDir)) {
    try {
      const manifest = JSON.parse(readFileSync(join(packagesDir, entry, 'package.json'), 'utf8'))
      if (manifest.name) {
        allNames.push(manifest.name)
      }
    }
    catch {}
  }
  const problems: string[] = [
    ...walkProblems(walk),
    ...packageTableProblems(
      readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8'),
      packages.map(pkg => pkg.name),
      allNames,
    ),
  ]

  for (const pkg of packages) {
    if (!offline) {
      const status = registryStatus(pkg.name)
      if (status !== true) {
        problems.push(`${pkg.name} ${status}`)
      }
    }

    let packed: { dest: string, tarball: string }
    try {
      packed = packPackage(pkg)
    }
    catch (err: any) {
      problems.push(`${pkg.name} could not be packed to verify it: ${describeError(err)}`)
      continue
    }
    try {
      const manifest = packedManifest(packed.tarball)
      for (const dep of workspaceProtocolDeps(manifest)) {
        problems.push(`${pkg.name} packs an unrewritten workspace protocol (${dep}); publish with pnpm, not npm`)
      }
      // An undeclared surface drifts: whatever lands in the directory ships, and
      // npm versions are immutable (#300).
      if (!manifest.files) {
        problems.push(`${pkg.name} declares no \`files\`, so it publishes whatever happens to sit in its directory`)
      }
      else if (!Array.isArray(manifest.files)) {
        problems.push(`${pkg.name} declares \`files\` as ${typeof manifest.files}, which must be an array`)
      }
      else if (unsupportedFilesEntries(manifest.files).length) {
        problems.push(`${pkg.name} declares \`files\` entries this check cannot match: ${unsupportedFilesEntries(manifest.files).join(', ')}`)
      }
      else {
        const paths = packedPaths(packed.tarball)
        for (const path of undeclaredPackedPaths(paths, manifest.files)) {
          problems.push(`${pkg.name} packs \`${path}\`, which no \`files\` entry declares`)
        }
        for (const entry of emptyFilesEntries(paths, manifest.files)) {
          problems.push(`${pkg.name} declares \`${entry}\` in \`files\` but ships nothing for it; renamed or mistyped?`)
        }
      }
      if (!BUNDLER_ONLY_PACKAGES.has(pkg.name)) {
        for (const entrypoint of entrypointResolutionProblems(packed.tarball, packed.dest)) {
          problems.push(`${pkg.name} advertises an entrypoint whose types do not resolve: ${entrypoint}`)
        }
      }
    }
    catch (err: any) {
      problems.push(`${pkg.name} could not be verified: ${describeError(err)}`)
    }
    finally {
      rmSync(packed.dest, { recursive: true, force: true })
    }
  }

  return problems
}

const REMEDY = 'Fix these before tagging: a tag cannot be moved once the GitHub release and half the registry refer to it.'

export function checkPublishable(root = ROOT, options: { offline?: boolean } = {}): CheckResult {
  return { problems: repositoryProblems(root, options), remedy: REMEDY, notes: [] }
}
