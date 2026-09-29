/*
 * What a worker's one call back to the main thread costs (#1020).
 *
 * This is where the pool rewrite shows: tinypool got a `MessageChannel` per task,
 * created, transferred and closed for every story, where this answers on the port
 * the task arrived on.
 *
 * Reported, not gated. The round trip against a bare dispatch reads 1.6–2.1x on an
 * idle laptop, where tinypool's per-task channel put it at 2.87x — but under load
 * it has been seen at 5.07x, and a threshold that survives that separates nothing.
 * See `pool.bench.ts` for why none of these numbers are assertions.
 *
 *   pnpm bench:pool -t rpc
 */
// `bench.compare()` reads to `test/consistent-test-it` as a test call it wants
// renamed, which it is not.
/* eslint-disable test/consistent-test-it */
import { expect, it } from 'vitest'
import { CALLS_BACK, EITHER, TIME_MS, withPool, withPoolResult } from './support/pool.js'

it('reports what a worker calling back mid-task costs against a bare dispatch', async ({ bench }) => {
  // Both arms on one pool, run adjacently, so the ratio is not a measure of what
  // the machine did between two pools.
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

it('reports the round trip against the recorded tinypool baseline', async ({ bench }) => {
  await withPool(CALLS_BACK, async () => 'transformed', async (pool) => {
    const result = await bench.compare(
      bench('ours', { writeResult: './src/node/__tests__/baselines/rpc.json' }, async () => {
        await pool.run(0)
      }),
      bench.from('tinypool', './src/node/__tests__/baselines/rpc.tinypool.json'),
      { time: TIME_MS },
    )

    expect(result.get('ours').throughput.mean, 'the rpc bench measured nothing').toBeGreaterThan(0)
  })
})
