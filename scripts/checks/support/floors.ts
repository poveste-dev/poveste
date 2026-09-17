// How each check knows its walk reached the tree.
//
// A walk that reads nothing compares nothing and reports no problems, so
// `assertNoProblems` passes over it exactly as `exit 0` once did (#719). #768
// deleted `check-walk-floors.ts` along with the CLI exits it policed, and with it
// the only record of which checks carry a floor and why the others do not
// (#773). `floors.spec.ts` holds every entry to the module it names, so a check
// added without an entry fails, and so does an entry that has stopped being true.

export type Floor
  /** Exports `walkProblems`, or imports one from the check whose walk it shares. */
  = | { walk: true }
  /** Reads a list another check walks, and that check carries the floor. */
    | { sibling: string }
  /** Reports an empty walk inline. The message is in the module and in its spec. */
    | { guard: string }
  /** Has no walk that can come back empty, or cannot have a floor. The reason says which. */
    | { exempt: string }

export const FLOORS: Record<string, Floor> = {
  'audit': { guard: 'the walk found no shipped packages' },
  'bundle-size': { guard: 'no built book under' },
  'changelog': { exempt: 'reads one section of one named file: a missing file throws, and a missing section is the failure it exists to report' },
  'config-reference': { exempt: '`parseConfig` throws when the interface it reads is gone, and a reference that reads empty reports every key as undocumented' },
  'conformance-config': { guard: 'defines no `:conformance` project' },
  'doc-coverage': { guard: 'no entrypoint was measured at all' },
  'docs-site': { guard: 'no build at' },
  'example-wiring': { guard: 'lists no required contexts' },
  'local-tags': { exempt: 'a repository with no tags is a normal state, so a floor would be false; the report prints the count instead (#740)' },
  'mirrored-conformance': { walk: true },
  'node-versions': { walk: true },
  'package-tests': { sibling: 'publishable' },
  'preview-position': { guard: 'no components found under' },
  'publishable': { walk: true },
  'published': { walk: true },
  'readmes': { walk: true },
  'recipes': { exempt: 'walks `RECIPES`, a list in the module itself, and reads each file by name: a file that is gone throws, and a section that is gone is reported' },
  'starters': { guard: 'declares no starters' },
  'step-gates': { walk: true },
  'task-graph': { guard: 'declares no `tasks:`' },
  'tsconfig-base': { guard: 'no package tsconfig' },
  'versions': { walk: true },
}
