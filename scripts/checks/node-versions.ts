// Asserts that CI takes its Node version from `.node-version`, not from a literal.
//
// `.node-version` exists to say which Node the toolchain runs on, and
// CONTRIBUTING treats it as authoritative — "the gate only means something if it
// runs on the Node that publishes". Two jobs read it and the rest wrote `26`,
// which agrees with the file today and stops agreeing the moment anyone bumps
// it. Nothing fails when that happens: 26 is still a valid Node, so the release
// would publish from a version nothing else in CI had exercised, with every
// check green.
//
// The drift is not hypothetical and not slow. #425 counted five jobs, recounted
// six a month later, and by the time it was fixed there were eight — two jobs
// added in between, one of them by the same person who later wrote this file.
// An enumeration maintained by hand loses to a repository that keeps growing
// jobs, which is the argument for a check rather than a sweep.
//
// One literal is allowed and is the point of the job it sits in: `Node floor`
// sets up `.node-version` and then switches to the lowest version
// `engines.node` admits, to prove the published range is real (#303). Sweeping
// that one would leave the job running and silently testing nothing.
//
// The floor is checked against `engines.node` rather than trusted, because its
// own comment says "Bump both together" and a comment cannot notice when only
// one of them moved.
//
// Reads text, not YAML: `setup-node` is used with `with:` blocks that a parser
// would have to walk anyway, and the question here is only whether a literal
// appears. No install, no network — it sits with the manifest checks at the
// front of `release:check`.

import type { CheckResult } from '../check-result.ts'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

export interface Allowance {
  /** The exact literal permitted. A different one is drift, not this allowance. */
  value: string
  reason: string
}

/**
 * The one hardcoded version that is deliberate, and why.
 *
 * Carries the value as well as the workflow, so that moving it, changing it, or
 * adding a second fails rather than passing quietly — a name alone would let
 * the allowed workflow accumulate any number of pins at any version.
 */
export const ALLOWED: Record<string, Allowance> = {
  'test.yml': {
    value: '22.22.2',
    reason: 'the `Node floor` job switches to the lowest version `engines.node` admits, on purpose — reading `.node-version` there would leave the job green while testing nothing (#303)',
  },
}

export interface NodeVersionUse {
  workflow: string
  line: number
  value: string
}

/** Every `node-version:` literal in one workflow. `node-version-file:` is not one. */
export function hardcodedNodeVersions(workflow: string, content: string): NodeVersionUse[] {
  return content.split('\n').flatMap((line, index) => {
    const match = /^\s*node-version:\s*['"]?([^'"\s#]+)/.exec(line)
    return match ? [{ workflow, line: index + 1, value: match[1] }] : []
  })
}

/** Ascending, on the three numeric parts. No prereleases appear in an engines range here. */
function compareVersions(a: string, b: string): number {
  const [x, y] = [a.split('.').map(Number), b.split('.').map(Number)]
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

/**
 * The lowest concrete version an `engines.node` range names.
 *
 * Reads the literals rather than resolving the range: the floor job pins one of
 * them verbatim, so the question is which literal is lowest, not which versions
 * satisfy the range. Returns undefined when the range names none, which is a
 * problem for the caller to report rather than a reason to guess.
 */
export function lowestVersion(enginesNode: string): string | undefined {
  return [...enginesNode.matchAll(/\d+\.\d+\.\d+/g)].map(match => match[0]).sort(compareVersions)[0]
}

/**
 * Every way the workflows and `.node-version` can disagree.
 *
 * The allowed floor is held to the *lowest* version `engines.node` names, not
 * merely to one it contains. A substring test would accept `26` against
 * `>=26.0.0` and leave the floor job running at the top of the range, proving
 * nothing about the bottom — which is the one thing it exists to prove (#303).
 */
export function nodeVersionProblems(
  uses: NodeVersionUse[],
  allowed: Record<string, Allowance>,
  enginesNode: string,
): string[] {
  const problems: string[] = []
  const seen = new Map<string, number>()
  const pinning = new Set(uses.map(use => use.workflow))
  const floor = lowestVersion(enginesNode)

  for (const use of uses) {
    const allowance = allowed[use.workflow]
    if (!allowance || use.value !== allowance.value) {
      problems.push(`${use.workflow}:${use.line} pins Node ${use.value}; use \`node-version-file: .node-version\` so the next bump reaches it`)
      continue
    }
    seen.set(use.workflow, (seen.get(use.workflow) ?? 0) + 1)
    if (floor === undefined) {
      problems.push(`${use.workflow}:${use.line} pins Node ${use.value}, but \`engines.node\` (${enginesNode}) names no concrete version to check it against`)
    }
    else if (use.value !== floor) {
      problems.push(`${use.workflow}:${use.line} pins Node ${use.value}, but the lowest version \`engines.node\` (${enginesNode}) names is ${floor} — the floor and the published range have to move together`)
    }
  }

  for (const [workflow, count] of seen) {
    if (count > 1) {
      problems.push(`${workflow} pins Node ${allowed[workflow].value} ${count} times; the allowance is for the one \`Node floor\` job, so the others have to read \`.node-version\``)
    }
  }

  // Only when the workflow pins nothing at all. One that pins the wrong literal
  // has already been reported as drift, and telling the reader to delete the
  // allowance would be the opposite of the fix.
  for (const workflow of Object.keys(allowed)) {
    if (!pinning.has(workflow)) {
      problems.push(`ALLOWED names ${workflow}, which no longer pins a Node version — delete the entry`)
    }
  }

  return problems
}

export interface Walk {
  uses: NodeVersionUse[]
  /** Workflow files read, by name. */
  workflows: string[]
  enginesNode: string
}

/**
 * The walk, split from the judging so a spec can point it at a fixture tree
 * and assert what it read (#719).
 */
export function collect(root = ROOT): Walk {
  const dir = join(root, '.github', 'workflows')
  const workflows = readdirSync(dir).filter(entry => /\.ya?ml$/.test(entry))
  const uses = workflows.flatMap(entry => hardcodedNodeVersions(entry, readFileSync(join(dir, entry), 'utf8')))

  // Read rather than assumed. A spec pointing this at a fixture that only
  // carries workflows — the obvious way to exercise the floor below — would
  // otherwise get ENOENT out of the walk instead of a `Walk` the floor can
  // describe, which is the failure this check is being given a floor to avoid.
  let manifest: any
  try {
    manifest = JSON.parse(readFileSync(join(root, 'packages', 'poveste', 'package.json'), 'utf8'))
  }
  catch {
    // Unreadable or unparseable only. A manifest that is there and declares no
    // `engines` is a different fault, and catching it here would hide a typo in
    // the line below as easily as it hides a missing block.
    manifest = undefined
  }
  const enginesNode: string = manifest?.engines?.node ?? ''

  return { uses, workflows, enginesNode }
}

/**
 * The floor: it read some workflows.
 *
 * `ALLOWED` gives this one a guard by accident — its reverse pass reports an
 * entry that no longer pins anything, so an empty walk fails there too. That is
 * a guard on the allow-list rather than on the walk, and it would go with the
 * list the day the allowance is deleted. This says what is meant (#719).
 */
export function walkProblems({ workflows, enginesNode }: Walk): string[] {
  const problems: string[] = []
  if (workflows.length === 0) {
    problems.push('.github/workflows held no workflow files — this check is reading a directory that has moved')
  }
  if (enginesNode === '') {
    problems.push('packages/poveste declares no `engines.node`, and the floor a pinned job is checked against comes from it')
  }
  return problems
}

function repositoryProblems(root = ROOT): string[] {
  const walk = collect(root)
  return [...walkProblems(walk), ...nodeVersionProblems(walk.uses, ALLOWED, walk.enginesNode)]
}

const REMEDY = '`.node-version` is what the release publishes from. A job that pins the number instead keeps building on it after the file moves, and stays green while doing it (#425).'

export function checkNodeVersions(root = ROOT): CheckResult {
  return { problems: repositoryProblems(root), remedy: REMEDY, notes: [] }
}
