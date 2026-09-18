// The Node check the CLI makes before it loads anything.
//
// `engines.node` is an install-time signal, and #901 is where it works against
// us: npm answers a Node its range rejects by resolving *backwards*, and the
// seventeen versions published before this package declared the field (0.1.0 to
// 0.6.1) accept every Node, so that is where it lands. #907 made the range
// contiguous, which removes the realistic case; it cannot remove the class,
// because nothing can be added to a version already published and deprecation
// does not stop npm choosing one.
//
// So the run-time signal is the one that is ours. Vite has carried this for
// years and its wording is the model (#913).
//
// Its own file, in plain ES2015, imported by `bin.mjs` before the CLI: the
// failure it exists for can be the import of `dist/`, and syntax this file
// cannot parse on an old Node would be the same defect wearing a different hat.

import { readFileSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

/**
 * The floor of a `>=x.y.z` range, or `null` for any other shape.
 *
 * One `>=` floor is the only shape `engines.node` may take — `scripts/checks/
 * versions.ts` holds every published package to it — so anything else means the
 * manifest has drifted, and the CLI says nothing rather than turning our own
 * drift into a reader's failed command.
 */
export function floorOf(range) {
  const match = /^>=(\d+)\.(\d+)\.(\d+)$/.exec(String(range ?? '').trim())
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

export function isBelow(version, floor) {
  const parts = String(version).split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const part = parts[i] ?? 0
    if (part !== floor[i]) {
      return part < floor[i]
    }
  }
  return false
}

/** Vite's wording, because a reader may well have seen it already. */
export function unsupportedNodeMessage(version, range) {
  return `You are using Node.js ${version}. Poveste requires Node.js version ${range}. Please upgrade your Node.js version.`
}

export function nodeProblem(version, range) {
  const floor = floorOf(range)
  return floor && isBelow(version, floor) ? unsupportedNodeMessage(version, range) : null
}

/** Exits 1, before the CLI is loaded, when this Node is below the declared floor. */
export function assertSupportedNode(manifestUrl = new URL('./package.json', import.meta.url)) {
  let range
  try {
    range = JSON.parse(readFileSync(fileURLToPath(manifestUrl), 'utf8')).engines?.node
  }
  catch {
    // A manifest this cannot read is not the reader's problem to be told about.
    return
  }

  const problem = nodeProblem(process.versions.node, range)
  if (problem) {
    console.error(problem)
    process.exit(1)
  }
}
