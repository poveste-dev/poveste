import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ES2015, deliberately outside `src` and outside `dist`
import { floorOf, isBelow, nodeProblem, unsupportedNodeMessage } from '../../../node-floor.mjs'

const PACKAGE = path.resolve(__dirname, '../../..')
const RANGE = '>=22.22.2'

describe('the Node a command is running on', () => {
  it('is a problem below the floor, named with the range it missed', () => {
    expect(nodeProblem('20.19.0', RANGE)).toBe(
      'You are using Node.js 20.19.0. Poveste requires Node.js version >=22.22.2. Please upgrade your Node.js version.',
    )
  })

  it('is fine at the floor itself', () => {
    expect(nodeProblem('22.22.2', RANGE)).toBeNull()
  })

  // The version in #901's gap, which the old range rejected and this one admits.
  it('is fine above it', () => {
    expect(nodeProblem('24.13.0', RANGE)).toBeNull()
  })

  // A patch below the floor is the case a major-only comparison would pass.
  it('is a problem one patch below the floor', () => {
    expect(nodeProblem('22.22.1', RANGE)).toBe(unsupportedNodeMessage('22.22.1', RANGE))
  })

  // Our own manifest drifting is not a reader's failed command. The range's shape
  // is held by `scripts/checks/versions.ts` instead.
  it('says nothing when the range is a shape this cannot read', () => {
    expect(nodeProblem('20.19.0', '^22.22.2 || ^24.15.0 || >=26.0.0')).toBeNull()
    expect(nodeProblem('20.19.0', undefined)).toBeNull()
  })
})

describe('reading the floor', () => {
  it('takes the three numbers of a `>=` floor', () => {
    expect(floorOf('>=22.22.2')).toEqual([22, 22, 2])
  })

  it('refuses every other shape', () => {
    expect(floorOf('^22.22.2 || >=26.0.0')).toBeNull()
    expect(floorOf('>=22.22.2 <30')).toBeNull()
    expect(floorOf('')).toBeNull()
  })

  it('treats a missing part as zero, so `23` is below `23.1.0`', () => {
    expect(isBelow('23', [23, 1, 0])).toBe(true)
  })
})

const OLD_NODE_VERSIONS = ['20.19.0', '18.20.8']

/** Where fnm keeps its installs on this platform, if it is installed at all. */
function oldNodeBinary(): string | undefined {
  const roots = [
    path.join(homedir(), 'Library/Application Support/fnm/node-versions'),
    path.join(homedir(), '.fnm/node-versions'),
  ]

  for (const root of roots) {
    for (const version of OLD_NODE_VERSIONS) {
      const binary = path.join(root, `v${version}`, 'installation/bin/node')
      if (existsSync(binary)) {
        return binary
      }
    }
  }

  return undefined
}

const OLD_NODE = oldNodeBinary()

/**
 * The CLI itself, run on a Node the range rejects.
 *
 * Skipped where such a Node is not installed, which is every CI runner: the
 * workflows install one Node, from `.node-version`, and `scripts/checks/
 * node-versions.ts` is what keeps it that way. The cases above run there, and
 * they exercise the same function this reaches through the binary.
 */
/** The same run with stderr on a pipe rather than captured directly. */
function pipedStderr(): string {
  return execFileSync('/bin/sh', ['-c', `"${OLD_NODE}" "${path.join(PACKAGE, 'bin.mjs')}" --version 2>&1 | cat`], { encoding: 'utf8' })
}

describe.skipIf(!OLD_NODE)('running `poveste` on an unsupported Node', () => {
  it('exits 1 naming Node and Poveste, before loading the CLI', () => {
    let status = 0
    let stderr = ''

    try {
      execFileSync(OLD_NODE as string, [path.join(PACKAGE, 'bin.mjs'), '--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    }
    catch (error: any) {
      status = error.status
      stderr = String(error.stderr)
    }

    expect(status).toBe(1)
    expect(stderr).toContain('Poveste requires Node.js version')
    // And through a pipe, which is the path `process.exit` can truncate. This does
    // not discriminate: at this length the old `console.error` + `exit` shape
    // printed all 112 bytes too, on macOS and Linux. It asserts the outcome that
    // matters rather than the mechanism.
    expect(pipedStderr()).toContain('Poveste requires Node.js version')
    // The CLI was never reached: its own failure on an old Node names neither it
    // nor Node, which is the whole reason this check is in `bin.mjs`.
    expect(stderr).not.toContain('dist/node/bin.js')
  })
})
