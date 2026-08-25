// Preflight for the release: every non-private workspace package must both
// exist on the registry and pack to an installable manifest. Two ways the
// release half-fails otherwise, both invisible to `release:check` and the smoke
// test until now (#286):
//
//   1. A package the registry has never seen. Trusted Publishing (OIDC) cannot
//      bootstrap it — there is no publisher for a package that does not exist —
//      so its first `pnpm publish` 404s, and `pnpm -r publish` then aborts,
//      stranding every package after it. 0.6.0 shipped eight of eleven this way.
//   2. A packed manifest that still carries pnpm's `workspace:` protocol. Only
//      `pnpm publish` / `pnpm pack` rewrite it; a manual `npm publish` ships it
//      literally and the package cannot be installed at all.
//
// A partial publish is the worst outcome available: the tag, the GitHub release
// and the changelog all claim a release the registry only partly has, and a tag
// cannot be moved. This turns that into a refusal, before anything is pushed.
//
// Unlike the sibling checks this one talks to the network (`npm view`).

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES = join(ROOT, 'packages')

interface Pkg {
  name: string
  dir: string
}

function publishablePackages(): Pkg[] {
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
function registryStatus(name: string): true | string {
  try {
    execFileSync('npm', ['view', name, 'version'], { stdio: ['ignore', 'ignore', 'pipe'] })
    return true
  }
  catch (err: any) {
    const stderr = String(err.stderr ?? '')
    if (/E404|404 Not Found/.test(stderr)) {
      return 'has never been published, so Trusted Publishing cannot bootstrap it — publish it once by hand, then configure its Trusted Publisher on npmjs.com'
    }
    // A network/auth blip is not proof the package exists; refuse rather than
    // let an unverified package reach the publish step.
    return `could not be verified on the registry: ${stderr.split('\n')[0]?.trim() || err.message}`
  }
}

const DEP_KEYS = ['dependencies', 'peerDependencies', 'optionalDependencies']

// Every dependency the packed (would-be-published) manifest still expresses with
// pnpm's `workspace:` protocol — which npm cannot install.
function unrewrittenWorkspaceDeps(pkg: Pkg): string[] {
  const dest = mkdtempSync(join(tmpdir(), 'poveste-pack-'))
  try {
    // `--ignore-scripts`: the manifest (with `workspace:` already rewritten) is
    // all this reads, so there is no need to run prepack builds for it.
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
  finally {
    rmSync(dest, { recursive: true, force: true })
  }
}

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
