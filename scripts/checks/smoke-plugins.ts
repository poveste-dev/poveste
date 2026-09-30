// `smoke-test.sh` is the gate that exists because green CI is compatible with a
// plugin nobody can install: npm resolves peers strictly while
// `pnpm-workspace.yaml` relaxes them repo-wide (#73). It ran **three of seven**
// published plugins for five releases, and `plugin-quasar` — one of the four it
// missed — shipped a version that could not build a single story for a consumer
// (#1048, #1052).
//
// The gap is not carelessness: the pass list is a list of names, and a list is
// stale the moment a plugin is added. So the set is derived here from the same
// manifests `publishable` reads, and the script's list is held to it.
//
// Two problems, not one. A plugin can be **packed and never installed** —
// `PLUGIN_PACKAGES` drives `pnpm pack`, and a name added there without a pass
// produces a tarball nothing consumes, which reads as coverage in the one place
// anyone looks. Both halves are checked because I introduced exactly that state
// while writing this, listing `plugin-nuxt` a step before its pass existed.

import type { CheckResult } from './support/check-result.ts'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

export const SMOKE_TEST = join('scripts', 'release', 'smoke-test.sh')

/** Every non-private `packages/*` whose published name marks it a plugin. */
export function publishedPlugins(root = ROOT): string[] {
  const names: string[] = []

  for (const entry of readdirSync(join(root, 'packages'))) {
    let manifest: { name?: string, private?: boolean }
    try {
      manifest = JSON.parse(readFileSync(join(root, 'packages', entry, 'package.json'), 'utf8'))
    }
    catch {
      continue
    }

    if (!manifest.private && manifest.name?.includes('plugin')) {
      names.push(entry)
    }
  }

  return names.sort()
}

/** The directory names in the script's `PLUGIN_PACKAGES=( … )` array. */
export function listedPlugins(script: string): string[] {
  const block = /PLUGIN_PACKAGES=\(([^)]*)\)/.exec(script)?.[1]
  return block === undefined ? [] : [...block.matchAll(/"([\w-]+)"/g)].map(match => match[1] ?? '').sort()
}

/**
 * Whether the script installs this plugin's tarball somewhere.
 *
 * `plugin_tgz <name>` is how a pass reaches one, so its absence means the tarball
 * is packed and handed to nobody. The name has to be literal — a pass that builds
 * it from a loop variable is invisible here, which is why the percy and screenshot
 * passes are written out rather than looped.
 */
export function hasPass(script: string, plugin: string): boolean {
  return new RegExp(`plugin_tgz "?${plugin}\\b`).test(script)
}

export function pluginProblems(published: string[], script: string): string[] {
  const listed = listedPlugins(script)

  if (listed.length === 0) {
    return [`${SMOKE_TEST} declares no \`PLUGIN_PACKAGES\` — this check is reading the wrong thing`]
  }

  const problems: string[] = []

  for (const plugin of published) {
    if (!listed.includes(plugin)) {
      problems.push(`${plugin} is published and has no pass in ${SMOKE_TEST}`)
    }
    else if (!hasPass(script, plugin)) {
      problems.push(`${plugin} is packed by ${SMOKE_TEST} and never installed by a pass`)
    }
  }

  for (const plugin of listed) {
    if (!published.includes(plugin)) {
      problems.push(`${SMOKE_TEST} packs ${plugin}, which is not a published plugin`)
    }
  }

  return problems
}

const REMEDY = `Add a pass to ${SMOKE_TEST}: a minimal book built from the tarballs with npm, at the ranges \`peer_range\` reads from the plugin's own \`peerDependencies\`. A plugin with no consumer-install pass is one whose first report comes from a reader.`

export function checkSmokePlugins(root = ROOT): CheckResult {
  const published = publishedPlugins(root)

  if (published.length === 0) {
    return {
      problems: [`no published plugin found under packages/ — this check is looking in the wrong place`],
      remedy: REMEDY,
      notes: [],
    }
  }

  const script = readFileSync(join(root, SMOKE_TEST), 'utf8')

  return {
    problems: pluginProblems(published, script),
    remedy: REMEDY,
    notes: [`${published.length} published plugins, ${listedPlugins(script).length} with a pass`],
  }
}
