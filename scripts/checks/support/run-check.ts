// Runs a check the way CI runs it — as a process — and tells apart the two
// things an exit code cannot.
//
// `collect()` returning files says nothing about what `main()` did with them,
// and the defect #719 is about is a check *reporting success*. The exit code is
// how that success is expressed, so something has to run the real thing and
// read it.
//
// What an exit code does not carry is whether the check ran at all. Several of
// these shell out — `checks/publishable` packs every package and asks `attw`
// about the result — so in a tree with no `node_modules` the check starts,
// fails to find its tool, catches that, and reports it as a problem. From
// outside it is indistinguishable from a real defect, and the spec fails with
// `expected 1 to be +0`, which names neither.
//
// So: the status is the assertion, and the output is read only to tell "did not
// run" from "ran and found something". That distinction is a diagnostic, not an
// assertion about wording — a reworded error stops being recognised and the
// spec still asserts the same status, so rewording a message can never turn a
// green spec red. That is the line #725's review drew and it is worth keeping.
//
// It does not skip. A spec that quietly skips when its dependencies are missing
// is the family of defect this whole sprint is about, so a check that could not
// run is a failure that says to run `pnpm install`.

import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import process from 'node:process'

/**
 * Output signatures of a check that never got to do its work.
 *
 * Deliberately about the runtime and the toolchain rather than about any
 * check's own wording: a missing binary, an unresolvable import, a tree with no
 * install. None of these is a sentence a check author writes or edits.
 */
const DID_NOT_RUN: Array<{ pattern: RegExp, because: string }> = [
  { pattern: /spawnSync (\S+) ENOENT/, because: 'it shells out to `$1`, which is not on PATH' },
  { pattern: /\bERR_MODULE_NOT_FOUND\b|Cannot find module/, because: 'a module it imports could not be resolved' },
  { pattern: /command not found/, because: 'a command it runs is not installed' },
]

export interface CheckRun {
  /** The exit status. `null` only when a signal killed it, which `runCheck` rejects. */
  status: number
  stdout: string
  stderr: string
}

/**
 * The reason a run is not a result, or `undefined` when it is one.
 *
 * Narrow by *signature* rather than by where in the output it appears. The
 * first version of this also matched `ENOENT` near a `node_modules` path, which
 * is text a check can legitimately report about the tree under test —
 * `checks/publishable` splices a failed `pnpm pack`'s stderr into a finding
 * verbatim — so a real verdict could be reported as a broken worktree.
 *
 * Filtering the check's own findings out was the wrong answer to that, and
 * measurably so: `checks/publishable` *catches* its spawn failures and reports
 * them as findings, so excluding findings excluded the one case this exists
 * for. Dropping the loose pattern fixes it where it went wrong.
 *
 * The three that remain are the runtime's own vocabulary, emitted by Node or
 * the shell and never by a check about a tree: a child process that would not
 * start, a module that would not load, a command that is not installed. None is
 * a sentence a check author writes, so the guarantee from #725's review holds —
 * rewording a check's message cannot turn a green spec red.
 */
export function didNotRun(output: string): string | undefined {
  for (const { pattern, because } of DID_NOT_RUN) {
    const match = pattern.exec(output)
    if (match) {
      return because.replace('$1', match[1] ?? '')
    }
  }
  return undefined
}

/**
 * Runs `scripts/<script>` with `args` and returns its status.
 *
 * Throws rather than returning when the check did not run, because a caller
 * asserting on the status would otherwise read an environment failure as a
 * verdict — in either direction.
 */
export function runCheck(script: string, args: string[] = []): CheckRun {
  const path = join(import.meta.dirname, '..', '..', script)
  const result = spawnSync(
    process.execPath,
    ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', path, ...args],
    { encoding: 'utf8' },
  )

  if (result.error) {
    throw new Error(`${script} could not be started: ${result.error.message}`)
  }
  if (result.status === null) {
    throw new Error(`${script} was killed by ${result.signal ?? 'a signal'} rather than exiting`)
  }

  // stderr only, and only when the check produced no verdict. A check that ran
  // to an answer has said something about the tree, and nothing here may
  // overrule that; a check that could not run exits non-zero having said
  // nothing about it.
  const output = result.stderr ?? ''
  const reason = result.status === 0 ? undefined : didNotRun(output)
  if (reason) {
    throw new Error(
      `${script} did not run to a verdict: ${reason}.
Its exit status (${result.status}) says nothing about the tree under test. Run \`pnpm install\` in this worktree.

${output.trim()}`,
    )
  }

  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}
