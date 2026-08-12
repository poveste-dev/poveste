// The release entry point. Resolves the next version, proves it is sane, and
// only then hands a concrete version string to bumpp.
//
// #188 is why this exists. The old script ended in a bare `--release` so that
// `pnpm release minor` appended the type as that flag's value. Passing the flag
// yourself — `pnpm release --release minor --yes` — expanded to
// `--release --release minor --yes`, so `--release` ate `--release` as its
// value, the version resolved to `undefined.undefined.undefined`, and bumpp
// wrote that into 22 manifests, committed, tagged and pushed to a protected
// `main` without one step objecting.
//
// Two rules keep that from recurring:
//
//   1. The invocation is strict. Exactly one argument, never a flag. There is
//      no argument position where a stray flag can be silently absorbed.
//   2. The version is resolved and checked *here*, before anything is written,
//      and passed to bumpp explicitly. A non-semver or non-increasing version
//      cannot reach a manifest, because we never call bumpp with one.
//
// Set RELEASE_DRY_RUN=1 to print the plan and exit without running anything.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import semver from 'semver'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TYPES = ['major', 'minor', 'patch'] as const

const USAGE = `Usage: pnpm release <${TYPES.join('|')}|x.y.z>

  pnpm release minor      0.5.0 -> 0.6.0
  pnpm release 0.6.0-rc.1 an explicit version, for anything the keywords cannot express

Pass the type as a bare argument. Flags are rejected on purpose: the previous
form let \`--release\` swallow a flag and resolve the version to undefined (#188).`

function fail(message: string): never {
  console.error(`❌ ${message}\n\n${USAGE}`)
  process.exit(1)
}

const args = process.argv.slice(2)

if (args.length === 0) {
  fail('No release type given.')
}

if (args.length > 1) {
  fail(`Expected exactly one argument, got ${args.length}: ${args.join(' ')}`)
}

const [requested] = args

if (requested.startsWith('-')) {
  fail(`"${requested}" is a flag. Pass only the release type or version.`)
}

const current = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version

if (!semver.valid(current)) {
  fail(`The root package.json version is "${current}", which is not valid semver.`)
}

const next = (TYPES as readonly string[]).includes(requested)
  ? semver.inc(current, requested as semver.ReleaseType)
  : semver.valid(requested)

if (!next) {
  fail(`"${requested}" is neither a release type (${TYPES.join(', ')}) nor a valid version.`)
}

if (!semver.gt(next, current)) {
  fail(`${next} is not greater than the current version ${current}.`)
}

console.warn(`▸ Releasing ${current} → ${next}`)

if (process.env.RELEASE_DRY_RUN) {
  console.warn('▸ RELEASE_DRY_RUN set — stopping before release:check and bumpp')
  process.exit(0)
}

function run(command: string, commandArgs: string[]) {
  console.warn(`▸ ${command} ${commandArgs.join(' ')}`)
  execFileSync(command, commandArgs, { cwd: ROOT, stdio: 'inherit' })
}

run('pnpm', ['run', 'release:check'])

// An explicit version, never a type: bumpp writes exactly what was checked above.
run('pnpm', ['exec', 'bumpp', '--yes', '--release', next])
