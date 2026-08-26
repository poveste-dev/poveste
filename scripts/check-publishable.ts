// Release preflight: every non-private workspace package must exist on the
// registry (OIDC cannot bootstrap a first publish), pack with no unrewritten
// `workspace:` protocol, and resolve every advertised entrypoint. A partial
// publish cannot be walked back (#286, #302). `--offline` drops the registry
// lookup, the only networked check. Needs each package built.

import { execFileSync } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES = join(ROOT, 'packages')
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

export function publishablePackages(): Pkg[] {
  const packages: Pkg[] = []
  for (const entry of readdirSync(PACKAGES)) {
    const dir = join(PACKAGES, entry)
    let manifest: any
    try {
      manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    }
    catch {
      continue
    }
    if (manifest.name && !manifest.private) {
      packages.push({ name: manifest.name, dir })
    }
  }
  return packages.sort((a, b) => a.name.localeCompare(b.name))
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

function unrewrittenWorkspaceDeps(tarball: string): string[] {
  const manifest = JSON.parse(
    String(execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], { stdio: ['ignore', 'pipe', 'pipe'] })),
  )
  return workspaceProtocolDeps(manifest)
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

function main(): void {
  const offline = process.argv.includes('--offline')
  const packages = publishablePackages()
  const problems: string[] = []
  const skippedEntrypoints: string[] = []

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
      for (const dep of unrewrittenWorkspaceDeps(packed.tarball)) {
        problems.push(`${pkg.name} packs an unrewritten workspace protocol (${dep}); publish with pnpm, not npm`)
      }
      if (BUNDLER_ONLY_PACKAGES.has(pkg.name)) {
        skippedEntrypoints.push(pkg.name)
      }
      else {
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

  if (problems.length > 0) {
    console.error('❌ This release would half-publish or ship uninstallable packages:\n')
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    console.error('\nFix these before tagging: a tag cannot be moved once the GitHub release and half the registry refer to it.')
    process.exit(1)
  }

  // Name what was not checked; a green line that overstates its coverage hides.
  const checks = [
    offline ? null : 'exist on the registry',
    'pack to an installable manifest',
    `resolve every advertised entrypoint (${packages.length - skippedEntrypoints.length}/${packages.length}${skippedEntrypoints.length ? `, bundler-only and skipped: ${skippedEntrypoints.join(', ')} — #312` : ''})`,
  ].filter(Boolean)
  console.log(`✅ All ${packages.length} publishable packages ${checks.join(', ')}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
