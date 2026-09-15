// Asserts that every published package declares a `test` script.
//
// `pnpm test` is `pnpm run -r --filter "./packages/**" test`, and pnpm skips a
// selected package with no `test` script in silence — no warning, no name, no
// non-zero exit. So a published package with no tests at all produces exactly
// the same output as one whose tests pass, and the count in the summary is the
// only thing that moves.
//
// That has now shipped twice. `@poveste/plugin-svelte` reached a release with
// no `test` script (#387) and so did `@poveste/plugin-percy` (#632); both were
// found by a person reading a manifest for an unrelated reason, and #351 had
// already tabulated the second one in a table that does not fail a build.
//
// No network, no install, no build: it reads manifests, which is why it sits
// with `test:versions` at the front of `release:check` rather than with
// `test:publishable` after it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { publishablePackages } from './publishable.ts'

/**
 * Packages that are published and will not have a `test` script.
 *
 * An entry is a claim that unit tests are the wrong tool for this package, not
 * that nobody has written them yet — "not written yet" is an issue, and #632 is
 * what that answer looks like. The reason is required because an exemption
 * whose argument nobody wrote is indistinguishable from a list somebody found
 * inconvenient.
 *
 * An exemption goes stale the moment the package gains a `test` script, so this
 * check fails on that too rather than letting the list outlive its reasons.
 */
export const EXEMPT: Record<string, string> = {
  '@poveste/vendors': 'its `src/` is seven re-export shims totalling 14 lines, and everything that can be wrong with it lives in `rollup.config.mjs` and runs at build time — which is why #305 and #560 were both caught by the build and not by a unit test',
}

export interface Manifest {
  name: string
  scripts?: Record<string, string>
}

/** Every way the published surface and the allow-list can disagree. */
export function testScriptProblems(manifests: Manifest[], exempt: Record<string, string>): string[] {
  const problems: string[] = []
  const published = new Set(manifests.map(manifest => manifest.name))

  for (const manifest of manifests) {
    const declares = Boolean(manifest.scripts?.test)
    const reason = exempt[manifest.name]

    if (!declares && !reason) {
      problems.push(`${manifest.name} is published and declares no \`test\` script, so \`pnpm test\` skips it without saying so`)
    }

    if (declares && reason) {
      problems.push(`${manifest.name} declares a \`test\` script now, so its exemption is stale — delete it from EXEMPT`)
    }
  }

  for (const name of Object.keys(exempt)) {
    if (!published.has(name)) {
      problems.push(`EXEMPT names ${name}, which is not a published package`)
    }
  }

  return problems
}

export function checkPackageTests(root?: string): string[] {
  const manifests = publishablePackages(root).map(({ name, dir }): Manifest => ({
    ...JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')),
    name,
  }))

  return testScriptProblems(manifests, EXEMPT)
}
