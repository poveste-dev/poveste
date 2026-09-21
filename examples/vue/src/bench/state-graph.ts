/*
 * The object graph the state-sync bench measures (#960).
 *
 * A binary tree of `2 ** (depth + 1) - 1` plain objects, reached through one
 * binding. The payload is load-bearing for the reference figures in
 * `bench/README.md`: a walker counts *values*, not objects, so depth 15 is
 * 65,535 objects plus 32,767 `d` numbers and 32,768 `leaf` booleans — 131,070
 * visits per walk. That arithmetic is the cheapest check there is on this
 * fixture, because it falls out of the shape before anything is run. Dropping
 * the payload for a bare `{ left, right }` halves the visits at the same object
 * count and moves every time in the table.
 */

export type BenchNode = { leaf: true } | { d: number, left: BenchNode, right: BenchNode }

export function treeOf(depth: number): BenchNode {
  return depth === 0
    ? { leaf: true }
    : { d: depth, left: treeOf(depth - 1), right: treeOf(depth - 1) }
}

/** What `treeOf` builds, for a story to say in its own markup. */
export function objectsAt(depth: number): number {
  return 2 ** (depth + 1) - 1
}
