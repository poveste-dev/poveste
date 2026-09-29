/*
 * What carrying an error across the worker boundary costs (#1020).
 *
 * `serializeError` probes each own property with a `structuredClone` before
 * keeping it, because one the clone rejects takes the whole `postMessage` down —
 * and that probe runs per failed story. Reported, not gated; see `pool.bench.ts`.
 */
// `bench.compare()` reads to this rule as a test call it wants renamed.
/* eslint-disable test/consistent-test-it */
import { expect, it } from 'vitest'
import { deserializeError, serializeError } from '../collect/error.js'

function transformError() {
  return Object.assign(new SyntaxError('Unexpected token, expected ","'), {
    frame: '2 |   <Story id="broken">\n3 |     <span>{{ oops( }}</span>\n  |              ^',
    id: '/src/components/Broken.story.vue',
    plugin: 'vite:vue',
    loc: { file: '/src/components/Broken.story.vue', line: 3, column: 14 },
  })
}

it('reports what serializing an error costs against cloning it', async ({ bench }) => {
  const result = await bench.compare(
    bench('structuredClone', () => {
      structuredClone(transformError())
    }),
    bench('serialize + deserialize', () => {
      deserializeError(structuredClone(serializeError(transformError())))
    }),
    { time: 500 },
  )

  const bare = result.get('structuredClone').throughput.mean
  const round = result.get('serialize + deserialize').throughput.mean
  // Measured at 1.25x: the per-property probe is far cheaper than it looks, because
  // a Vite error carries a handful of small ones.
  const cost = bare / round
  expect(cost, `a serialized round trip cost ${cost.toFixed(2)}x a bare structured clone`).toBeGreaterThan(0)
})

it('keeps the frame a bare clone drops, which is what the cost buys', async ({ bench }) => {
  // A serializer that quietly stopped copying properties would measure fastest.
  const result = await bench('round trip', { time: 100 }, () => {
    deserializeError(structuredClone(serializeError(transformError())))
  }).run()

  expect(result.throughput.mean).toBeGreaterThan(0)
  const carried = deserializeError(structuredClone(serializeError(transformError()))) as Error & { frame?: string }
  expect(carried.frame, 'the frame did not survive, so this is measuring the wrong thing').toContain('oops(')
})
