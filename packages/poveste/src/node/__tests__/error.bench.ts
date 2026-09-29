/*
 * What carrying an error across the worker boundary costs (#1020).
 *
 * `serializeError` walks an error's own properties and tests each one with a
 * `structuredClone` before keeping it, because a property the clone rejects takes
 * the whole `postMessage` down. That probe is the thing worth measuring: it runs
 * once per failed story, and it is the price of the code frame surviving.
 *
 * Both terms are measured here against each other, so the ratio is at least paired
 * — but it is reported rather than gated, for the reason in `pool.bench.ts`.
 *
 *   pnpm bench:pool -t serializing
 */
// `bench.compare()` reads to `test/consistent-test-it` as a test call it wants
// renamed, which it is not.
/* eslint-disable test/consistent-test-it */
import { expect, it } from 'vitest'
import { deserializeError, serializeError } from '../collect/error.js'

/** What a failed story actually throws: a Vite transform error with its frame. */
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
  // The measure above is only worth having if the thing it measures still works,
  // and a serializer that quietly stopped copying properties would look fastest.
  const result = await bench('round trip', { time: 100 }, () => {
    deserializeError(structuredClone(serializeError(transformError())))
  }).run()

  expect(result.throughput.mean).toBeGreaterThan(0)
  const carried = deserializeError(structuredClone(serializeError(transformError()))) as Error & { frame?: string }
  expect(carried.frame, 'the frame did not survive, so this is measuring the wrong thing').toContain('oops(')
})
