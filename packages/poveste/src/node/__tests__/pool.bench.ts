/*
 * What the pool's scheduling costs, with no story in front of it (#1020).
 *
 * Nothing here asserts a timing: three thresholds were tried and each flaked on a
 * laptop. Figures and method are in `bench/README.md`; `pool.spec.ts` holds what
 * a mutation can fail.
 *
 *   pnpm bench:pool [-t collecting]
 */
// `bench.compare()` reads to this rule as a test call it wants renamed.
/* eslint-disable test/consistent-test-it */
import { expect, it } from 'vitest'
import { ECHO, noInvoke, QUEUED, STORY_PAYLOAD, THREADS, TIME_MS, withPoolResult } from './support/pool.js'

// Bounded by free cores, not only by the scheduler: about 3 of 4 idle, 1.8 with a
// lint alongside. A serial pool reads about 1, and nothing separates that from a
// busy machine.
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
