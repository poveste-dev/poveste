// A throwaway tree on disk for a check's walk to read.
//
// The half of every check that finds and opens files is asserted nowhere, and
// the reason is that there was no way to point a walk at anything but the
// repository (#719). Each `check-*.ts` now takes `root` as a parameter with the
// real value as its default, and this builds the trees those specs aim it at.
//
// A real directory rather than a mocked `fs`: the thing under test is whether
// the walk reaches files, and a mock that answers `readdirSync` is an assertion
// about the mock. `mkdtemp` keeps concurrent spec files from sharing a path.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const made: string[] = []

/** Writes `path -> content` under a fresh temporary root and returns it. */
export function tree(layout: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'poveste-check-'))
  made.push(root)

  for (const [path, content] of Object.entries(layout)) {
    mkdirSync(join(root, dirname(path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }

  return root
}

/** Deletes every tree built so far. Call from `afterEach`. */
export function removeTrees(): void {
  for (const root of made.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
}
