/*
 * What the pool's scheduling costs, with no story in front of it (#1020).
 *
 * The pool replaced `@akryum/tinypool`, which cannot be a live participant any
 * more — it is no longer a dependency — so its numbers sit under `baselines/` and
 * come back through `bench.from`. The round trip a worker makes mid-task is in
 * `rpc.bench.ts`, beside the code that carries it.
 *
 * **The tinypool column is printed, not asserted.** Ours is measured live while
 * tinypool's comes off disk, so nothing cancels a machine that has drifted since
 * the baseline was taken — running this straight after a lint and a test suite put
 * `collecting` at 0.44x, and the same code minutes earlier at 1.25x. A floor wide
 * enough to survive that catches nothing worth catching.
 *
 * Paired ratios measured inside one run are better, and are what the other benches
 * report — but not reliable enough to gate on either: the `invoke` round trip
 * reads 1.6–2.1x idle and has been seen at 5.07x under load. So **nothing here
 * asserts a timing.** Every bench asserts only that it measured something, which
 * is what `bench/smoke.spec.ts` says about this project's other instruments, and
 * the numbers are for a person to read against `bench/README.md`.
 *
 * What does gate is in `pool.spec.ts`, where the properties are correctness and a
 * mutation makes them fail. The honest head-to-head comes from interleaving the
 * two implementations run by run; `bench/README.md` records it and the method.
 *
 *   pnpm bench:pool                  # every bench in this package
 *   pnpm bench:pool -t collecting    # one measure
 */
// `bench.compare()` reads to `test/consistent-test-it` as a test call it wants
// renamed, which it is not.
/* eslint-disable test/consistent-test-it */
import { expect, it } from 'vitest'
import { ECHO, noInvoke, QUEUED, STORY_PAYLOAD, THREADS, TIME_MS, withPool, withPoolResult } from './support/pool.js'

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

/*
 * The four shapes against tinypool's recorded numbers. Read the printed columns;
 * nothing here asserts on them, for the reason in the header.
 */
it('reports the four shapes against the recorded tinypool baselines', async ({ bench }) => {
  await withPool(ECHO, noInvoke, async (pool) => {
    await bench.compare(
      bench('ours', { writeResult: './src/node/__tests__/baselines/collecting.json' }, async () => {
        await Promise.all(Array.from({ length: QUEUED }, () => pool.run(STORY_PAYLOAD)))
      }),
      bench.from('tinypool', './src/node/__tests__/baselines/collecting.tinypool.json'),
      { time: TIME_MS },
    )
    await bench.compare(
      bench('ours', { writeResult: './src/node/__tests__/baselines/saturated.json' }, async () => {
        await Promise.all(Array.from({ length: QUEUED }, () => pool.run(0)))
      }),
      bench.from('tinypool', './src/node/__tests__/baselines/saturated.tinypool.json'),
      { time: TIME_MS },
    )
    await bench.compare(
      bench('ours', { writeResult: './src/node/__tests__/baselines/dispatch.json' }, async () => {
        await pool.run(0)
      }),
      bench.from('tinypool', './src/node/__tests__/baselines/dispatch.tinypool.json'),
      { time: TIME_MS },
    )
    await bench.compare(
      bench('ours', { writeResult: './src/node/__tests__/baselines/payload.json' }, async () => {
        await pool.run(STORY_PAYLOAD)
      }),
      bench.from('tinypool', './src/node/__tests__/baselines/payload.tinypool.json'),
      { time: TIME_MS },
    )
  })
})
