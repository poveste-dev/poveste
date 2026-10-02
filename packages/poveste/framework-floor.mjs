// The framework check the CLI makes before it loads anything, beside the Node one.
//
// A framework plugin declares its framework as a peer, and the package manager
// enforces that well — until a reader takes `--legacy-peer-deps`, which npm's own
// ERESOLVE output suggests. On Nuxt 3 what they meet next is `Cannot find package
// 'vite'`: Nuxt 4 hoists the `vite@^8` Poveste imports and Nuxt 3 does not. That
// failure comes from importing the CLI's commands, before the config — and so the
// plugin — is loaded at all, which is why the plugin cannot check its own peer in
// time and this file does (#1062).
//
// Nuxt only, until a second instance is reported. One measured case does not
// justify holding six plugins' peers here; another is one line in `PEERS`.
//
// Plain ES2015 beside `node-floor.mjs`, for the reason that file gives.

import { readFileSync, writeSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { isBelow } from './node-floor.mjs'

/** Each plugin whose framework is checked, and the peer that names it. */
export const PEERS = {
  '@poveste/plugin-nuxt': 'nuxt',
}

/**
 * The floor of a `^x.y.z` or `>=x.y.z` range, or `null` for any other shape.
 *
 * Only the floor: a version above a caret's major is the package manager's to
 * refuse, and saying nothing about a shape this cannot read keeps our own
 * manifest drift from becoming a reader's failed command.
 */
export function rangeFloor(range) {
  const match = /^(?:\^|>=)(\d+)\.(\d+)\.(\d+)$/.exec(String(range ?? '').trim())
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

/** The manifest of `name` as Node would find it from `dir`, or `null`. */
export function installedManifest(name, dir) {
  for (let current = dir; ; current = dirname(current)) {
    try {
      return JSON.parse(readFileSync(join(current, 'node_modules', name, 'package.json'), 'utf8'))
    }
    catch {
      if (dirname(current) === current) {
        return null
      }
    }
  }
}

/** The Node message's shape, so the two read as one family. */
export function unsupportedFrameworkMessage(framework, version, plugin, range) {
  return `You are using ${framework} ${version}. ${plugin} requires ${framework} ${range}. Please upgrade ${framework}.`
}

/** A sentence per checked plugin whose installed framework is below its peer floor. */
export function frameworkProblems(dir) {
  const problems = []

  for (const [plugin, framework] of Object.entries(PEERS)) {
    const range = installedManifest(plugin, dir)?.peerDependencies?.[framework]
    const floor = rangeFloor(range)
    const version = installedManifest(framework, dir)?.version
    if (floor && version && isBelow(version, floor)) {
      problems.push(unsupportedFrameworkMessage(framework, version, plugin, range))
    }
  }

  return problems
}

/** Whether the project's frameworks may run the CLI, saying so on stderr when not. */
export function supportedFrameworks(dir = process.cwd()) {
  const problems = frameworkProblems(dir)
  if (problems.length === 0) {
    return true
  }

  writeSync(2, `${problems.join('\n')}\n`)
  process.exitCode = 1
  return false
}
