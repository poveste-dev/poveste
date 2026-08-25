// Release preflight: every non-private workspace package must exist on the
// registry (else OIDC cannot bootstrap its first publish) and pack to a manifest
// with no unrewritten `workspace:` protocol (else it cannot be installed). A
// partial publish cannot be walked back, so this refuses before anything is
// pushed. See #286. Talks to the network (`npm view`), unlike the sibling checks.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES = join(ROOT, 'packages')
const DEP_KEYS = ['dependencies', 'peerDependencies', 'optionalDependencies']

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

function unrewrittenWorkspaceDeps(pkg: Pkg): string[] {
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
    const manifest = JSON.parse(
      String(execFileSync('tar', ['-xzOf', join(dest, tarball), 'package/package.json'], { stdio: ['ignore', 'pipe', 'pipe'] })),
    )
    return workspaceProtocolDeps(manifest)
  }
  finally {
    rmSync(dest, { recursive: true, force: true })
  }
}

function main(): void {
  const packages = publishablePackages()
  const problems: string[] = []

  for (const pkg of packages) {
    const status = registryStatus(pkg.name)
    if (status !== true) {
      problems.push(`${pkg.name} ${status}`)
    }
    try {
      for (const dep of unrewrittenWorkspaceDeps(pkg)) {
        problems.push(`${pkg.name} packs an unrewritten workspace protocol (${dep}); publish with pnpm, not npm`)
      }
    }
    catch (err: any) {
      problems.push(`${pkg.name} could not be packed to verify its manifest: ${err.message}`)
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

  console.log(`✅ All ${packages.length} publishable packages exist on the registry and pack to an installable manifest`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
