/*
 * What a worker's one call back to the main thread costs (#1020) — where the
 * rewrite shows, since tinypool built and closed a `MessageChannel` per task.
 *
 * Reported, not gated; see `pool.bench.ts`.
 */
// `bench.compare()` reads to this rule as a test call it wants renamed.
/* eslint-disable test/consistent-test-it */
import { expect, it } from 'vitest'
import { EITHER, TIME_MS, withPoolResult } from './support/pool.js'

it('reports what a worker calling back mid-task costs against a bare dispatch', async ({ bench }) => {
  // Both arms on one pool, adjacent: measured on two pools the ratio drifts with
  // whatever happened in between.
  const paired = await withPoolResult(EITHER, async () => 'transformed', async (pool) => {
    return bench.compare(
      bench('dispatch', async () => { await pool.run(0) }),
      bench('invoke', async () => { await pool.run(1) }),
      { time: TIME_MS },
    )
  })

  const cost = paired.get('dispatch').throughput.mean / paired.get('invoke').throughput.mean
  expect(cost, `an invoke round trip cost ${cost.toFixed(2)}x a bare dispatch, which is reported rather than gated`).toBeGreaterThan(0)
})
