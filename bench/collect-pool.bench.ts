/*
 * The collector's worker pool (#1020): what the scheduler costs with no story in
 * front of it.
 *
 * The pool replaced `@akryum/tinypool`, and each measure is one thing the old pool
 * also did. The old one cannot be a live participant — it is no longer a
 * dependency — so its numbers sit under `bench/baselines/` and come back through
 * `bench.from`.
 *
 * **Two kinds of assertion, and only one of them travels.**
 *
 * `bench.from` reads a file while ours is measured live, so nothing cancels a
 * machine that has drifted since the baseline was taken. Measured minutes apart on
 * the same laptop, `dispatch` moved from 1.03x to 0.90x against the same file
 * while tinybench reported a 0.2% margin of error each time: precise, and not
 * comparable. Those comparisons therefore assert only a structural floor, wide
 * enough that drift cannot trip it and narrow enough to catch a pool that has
 * genuinely fallen over.
 *
 * The ratio worth gating is measured within one run, where both terms meet the
 * same machine: what an `invoke` round trip costs against a bare dispatch. That is
 * the change itself — tinypool built, transferred and closed a `MessageChannel`
 * per task — and it holds whatever the hardware.
 *
 * The honest head-to-head numbers come from interleaving the two implementations
 * run by run, which is a different exercise; `bench/README.md` records them and
 * the method.
 *
 *   pnpm bench:pool                 # every measure
 *   pnpm bench:pool -t rpc          # one of them
 */
// `bench.compare()` reads to `test/consistent-test-it` as a test call it wants
// renamed, which it is not.
/* eslint-disable test/consistent-test-it */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'
import { createPool, DONE, TASK } from '../packages/poveste/dist/node/collect/pool.js'

const RPC_REQUEST = 'pvt:invoke'
const RPC_RESPONSE = 'pvt:invoked'

const THREADS = 4

/** A build hands the pool every story at once, so a queue is the normal path. */
const QUEUED = THREADS * 4

/** Long enough for tinybench's margin of error to settle under a percent. */
const TIME_MS = 500

/**
 * How much of tinypool's recorded throughput a measure has to keep. Wide, because
 * the two sides did not meet the same machine — this is here to catch a pool that
 * has fallen over, not to rank them.
 */
const FLOOR = 0.5

/**
 * What an `invoke` round trip may cost against a bare dispatch, measured in the
 * same run. Tinypool sat at 2.87x because every task built, transferred and closed
 * a `MessageChannel`; answering on the port the task arrived on puts this near 2x,
 * which is the one extra round trip and nothing else.
 */
const RPC_OVER_DISPATCH = 2.5

const dir = mkdtempSync(join(tmpdir(), 'poveste-bench-pool-'))

function workerFile(name: string, body: string) {
  const file = join(dir, `${name}.mjs`)
  writeFileSync(file, `
import { parentPort } from 'node:worker_threads'
const TASK = ${JSON.stringify(TASK)}
const DONE = ${JSON.stringify(DONE)}
const RPC_REQUEST = ${JSON.stringify(RPC_REQUEST)}
const RPC_RESPONSE = ${JSON.stringify(RPC_RESPONSE)}
${body}
`)
  return pathToFileURL(file)
}

/** Answers at once. Anything it did would be measured as the pool's. */
const ECHO = workerFile('echo', `
  parentPort.on('message', (m) => {
    if (m?.kind !== TASK) return
    parentPort.postMessage({ kind: DONE, result: 1 })
  })
`)

/** Calls back once before answering, the way a worker fetches a module. */
const CALLS_BACK = workerFile('calls-back', `
  let nextId = 0
  const pending = new Map()
  parentPort.on('message', (m) => {
    if (m?.kind === RPC_RESPONSE) { pending.get(m.id)?.(); pending.delete(m.id); return }
    if (m?.kind !== TASK) return
    const id = nextId++
    pending.set(id, () => parentPort.postMessage({ kind: DONE, result: 1 }))
    parentPort.postMessage({ kind: RPC_REQUEST, id, name: 'fetchModule', data: ['/src/Button.vue'] })
  })
`)

/** The collector hands its worker a file record, not a scalar. */
const STORY_PAYLOAD = {
  root: '/repo',
  base: '/',
  storyFile: {
    path: '/repo/src/components/Button.story.vue',
    relativePath: 'src/components/Button.story.vue',
    moduleId: '/src/components/Button.story.vue',
    supportPluginId: 'vue',
    markdownFile: null,
  },
  defineGlobals: { __VUE_OPTIONS_API__: true, __VUE_PROD_DEVTOOLS__: false },
}

const noInvoke = async () => undefined

async function withPool(filename: URL, invoke: (name: string, data: unknown[]) => Promise<unknown>, body: (pool: ReturnType<typeof createPool>) => Promise<void>) {
  const pool = createPool({ filename, threads: THREADS, invoke })
  // One task through every worker first, so spawn and module load are not measured.
  await Promise.all(Array.from({ length: THREADS }, () => pool.run(0)))
  try {
    await body(pool)
  }
  finally {
    await pool.destroy()
  }
}

/** Asserts the wide structural floor, and says what it actually measured. */
function atLeastFloor(result: { get: (name: string) => { throughput: { mean: number } } }, measure: string) {
  const ours = result.get('ours').throughput.mean
  const tinypool = result.get('tinypool').throughput.mean
  const ratio = (ours / tinypool).toFixed(2)
  expect(ours, `${measure} came out at ${ratio}x the recorded tinypool baseline, under the ${FLOOR} floor`).toBeGreaterThan(tinypool * FLOOR)
}

it('dispatch: a task out and its result back', async ({ bench }) => {
  await withPool(ECHO, noInvoke, async (pool) => {
    const result = await bench.compare(
      bench('ours', { writeResult: './bench/baselines/dispatch.json' }, async () => {
        await pool.run(0)
      }),
      bench.from('tinypool', './bench/baselines/dispatch.tinypool.json'),
      { time: TIME_MS },
    )

    atLeastFloor(result, 'dispatch')
  })
})

it('rpc: a worker calling back mid-task costs about one more round trip', async ({ bench }) => {
  // The gate that travels. Both terms are measured here, against each other.
  const throughput: Record<string, number> = {}

  await withPool(ECHO, noInvoke, async (pool) => {
    const bare = await bench('dispatch', { time: TIME_MS }, async () => {
      await pool.run(0)
    }).run()
    throughput['dispatch'] = bare.throughput.mean
  })

  await withPool(CALLS_BACK, async () => 'transformed', async (pool) => {
    const result = await bench.compare(
      bench('ours', { writeResult: './bench/baselines/rpc.json' }, async () => {
        await pool.run(0)
      }),
      bench.from('tinypool', './bench/baselines/rpc.tinypool.json'),
      { time: TIME_MS },
    )

    atLeastFloor(result, 'rpc')
    throughput['rpc'] = result.get('ours').throughput.mean
  })

  const cost = throughput['dispatch']! / throughput['rpc']!
  expect(cost, `an invoke round trip cost ${cost.toFixed(2)}x a bare dispatch`).toBeLessThan(RPC_OVER_DISPATCH)
})

it('collecting: a queue of story-sized tasks, which is the real shape', async ({ bench }) => {
  await withPool(ECHO, noInvoke, async (pool) => {
    const result = await bench.compare(
      bench('ours', { writeResult: './bench/baselines/collecting.json' }, async () => {
        await Promise.all(Array.from({ length: QUEUED }, () => pool.run(STORY_PAYLOAD)))
      }),
      bench.from('tinypool', './bench/baselines/collecting.tinypool.json'),
      { time: TIME_MS },
    )

    atLeastFloor(result, 'collecting')
  })
})

it('saturated: a queue of scalar tasks, the same shape without the payload', async ({ bench }) => {
  await withPool(ECHO, noInvoke, async (pool) => {
    const result = await bench.compare(
      bench('ours', { writeResult: './bench/baselines/saturated.json' }, async () => {
        await Promise.all(Array.from({ length: QUEUED }, () => pool.run(0)))
      }),
      bench.from('tinypool', './bench/baselines/saturated.tinypool.json'),
      { time: TIME_MS },
    )

    atLeastFloor(result, 'saturated')
  })
})

it('payload: one story-sized task at a time, which tinypool wins', async ({ bench }) => {
  // Tinypool's worker blocks on `Atomics.wait` and drains with
  // `receiveMessageOnPort`, taking a message without an event-loop turn. This pool
  // waits on `parentPort`'s `message` event, and the turn shows when a round trip
  // is all there is — `dispatch`, the same shape with a scalar, is level.
  // Collection never runs this way, so the gap is recorded rather than chased.
  await withPool(ECHO, noInvoke, async (pool) => {
    const result = await bench.compare(
      bench('ours', { writeResult: './bench/baselines/payload.json' }, async () => {
        await pool.run(STORY_PAYLOAD)
      }),
      bench.from('tinypool', './bench/baselines/payload.tinypool.json'),
      { time: TIME_MS },
    )

    atLeastFloor(result, 'payload')
  })
})
