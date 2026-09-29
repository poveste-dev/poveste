/*
 * What the pool's scheduling costs, with no story in front of it (#1020).
 *
 * The round trip a worker makes mid-task is in `rpc.bench.ts`, beside the code
 * that carries it.
 *
 * **Nothing here asserts a timing.** Three attempts at a threshold each failed on a
 * laptop — the tightest, an `invoke` round trip against a bare dispatch with both
 * arms paired on one pool, reads 1.6–2.1x idle and has been seen at 5.07x under
 * load. So every bench asserts only that it measured something, which is what
 * `bench/smoke.spec.ts` says about this project's other instruments, and the
 * numbers are for a person to read against `bench/README.md`.
 *
 * What does gate is in `pool.spec.ts`, where the properties are correctness and a
 * mutation makes them fail.
 *
 * The comparison against `@akryum/tinypool`, which this pool replaced, was a
 * one-off: the fork is no longer a dependency, and a recorded baseline cannot be
 * compared against a live run on a different machine anyway. `bench/README.md` has
 * the numbers and how they were taken.
 *
 *   pnpm bench:pool                  # every bench in this package
 *   pnpm bench:pool -t collecting    # one measure
 */
// `bench.compare()` reads to `test/consistent-test-it` as a test call it wants
// renamed, which it is not.
/* eslint-disable test/consistent-test-it */
import { expect, it } from 'vitest'
import { ECHO, noInvoke, QUEUED, STORY_PAYLOAD, THREADS, TIME_MS, withPoolResult } from './support/pool.js'

/*
 * Reported, not asserted: how many workers the queue kept fed is bounded by how
 * many cores are free, so it reads about 3 of 4 on an idle laptop and 1.8 with a
 * lint running alongside. A pool that dispatched serially would read about 1, but
 * no threshold separates that from a busy machine — and `pool.spec.ts` already
 * asserts the property that matters, by draining a queue many times the worker
 * count and failing if a task goes missing.
 */
it('reports how many workers a queue keeps fed', async ({ bench }) => {
  const paired = await withPoolResult(ECHO, noInvoke, async (pool) => {
    return bench.compare(
      bench('one at a time', async () => { await pool.run(0) }),
      bench('queued', async () => {
        await Promise.all(Array.from({ length: QUEUED }, () => pool.run(0)))
      }),
      { time: TIME_MS },
    )
  })

  const fed = (paired.get('queued').throughput.mean * QUEUED) / paired.get('one at a time').throughput.mean
  expect(fed, `a queue kept ${fed.toFixed(2)} of ${THREADS} workers fed, which is not a number to gate on`).toBeGreaterThan(0)
})

it('reports what a story-sized payload costs against a scalar', async ({ bench }) => {
  const paired = await withPoolResult(ECHO, noInvoke, async (pool) => {
    return bench.compare(
      bench('scalar', async () => { await pool.run(0) }),
      bench('story record', async () => { await pool.run(STORY_PAYLOAD) }),
      { time: TIME_MS },
    )
  })

  const cost = paired.get('scalar').throughput.mean / paired.get('story record').throughput.mean
  expect(cost, `a story-sized payload cost ${cost.toFixed(2)}x a scalar`).toBeGreaterThan(0)
})

/** The four shapes, side by side, in the order a build leans on them. */
it('reports the four shapes a build puts through the pool', async ({ bench }) => {
  const measured = await withPoolResult(ECHO, noInvoke, async (pool) => {
    return bench.compare(
      bench('collecting', async () => {
        await Promise.all(Array.from({ length: QUEUED }, () => pool.run(STORY_PAYLOAD)))
      }),
      bench('saturated', async () => {
        await Promise.all(Array.from({ length: QUEUED }, () => pool.run(0)))
      }),
      bench('dispatch', async () => { await pool.run(0) }),
      bench('payload', async () => { await pool.run(STORY_PAYLOAD) }),
      { time: TIME_MS },
    )
  })

  for (const name of ['collecting', 'saturated', 'dispatch', 'payload']) {
    expect(measured.get(name).throughput.mean, `${name} measured nothing`).toBeGreaterThan(0)
  }
})
