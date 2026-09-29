/*
 * The collector's worker pool (#1020): what the scheduler itself costs, with no
 * story in the way.
 *
 * The pool replaced `@akryum/tinypool`, so the question this answers is whether
 * the replacement is at least as quick. Each measure isolates one thing the old
 * pool also did, so the same script can be pointed at either implementation:
 *
 *   throughput   trivial tasks per second through N workers — the scheduler's
 *                dispatch and hand-back, and nothing else
 *   latency      one task, start to settled, on an idle pool
 *   rpc          a worker's `invoke` round trip, which under the new pool shares
 *                the channel with task dispatch and under the old one had a port
 *                of its own per task
 *   broadcast    a message out to every worker while all of them are busy
 *   payload      a task carrying a story-sized object, since a per-task port used
 *                to be transferred alongside it
 *
 * Counts are load-independent and are the field to compare across machines; every
 * ms here moves with the runner.
 *
 * `--stress` adds a sustained run: a queue many times the worker count, with a
 * broadcast storm interleaved, reported as throughput held against the quiet
 * `throughput` figure. A pool that degrades under depth shows up as a ratio well
 * under 1.
 *
 *   node bench/collect-pool.mjs [--threads 4] [--tasks 2000] [--runs 7] [--stress] [--json]
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { createPool, DONE, TASK } from '../packages/poveste/dist/node/collect/pool.js'

// stdout is the interface: results are JSON or a table for the terminal.
/* eslint-disable no-console */

const RPC_REQUEST = 'pvt:invoke'
const RPC_RESPONSE = 'pvt:invoked'

const dir = mkdtempSync(join(tmpdir(), 'poveste-bench-pool-'))

/** A story-sized payload: the collector hands its worker a file record, not a scalar. */
function storyPayload() {
  return {
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
}

function workerFile(name, body) {
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

/** Answers every task at once. Anything it does would be measured as the pool's. */
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
    if (m?.kind === RPC_RESPONSE) {
      pending.get(m.id)?.()
      pending.delete(m.id)
      return
    }
    if (m?.kind !== TASK) return
    const id = nextId++
    pending.set(id, () => parentPort.postMessage({ kind: DONE, result: 1 }))
    parentPort.postMessage({ kind: RPC_REQUEST, id, name: 'fetchModule', data: ['/src/Button.vue'] })
  })
`)

/** Reports how many broadcasts it had seen when its task ended. */
const COUNTS = workerFile('counts', `
  let seen = 0
  parentPort.on('message', async (m) => {
    if (m?.kind === 'hst:invalidate') { seen++; return }
    if (m?.kind !== TASK) return
    await new Promise(r => setTimeout(r, m.payload))
    parentPort.postMessage({ kind: DONE, result: seen })
  })
`)

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function range(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return [sorted[0], sorted[sorted.length - 1]]
}

async function withPool(filename, threads, invoke, body) {
  const pool = createPool({ filename, threads, invoke: invoke ?? (async () => undefined) })
  // A first task through every worker, so spawn and module load are not measured.
  await Promise.all(Array.from({ length: threads }, () => pool.run(0)))
  try {
    return await body(pool)
  }
  finally {
    await pool.destroy()
  }
}

async function measureThroughput({ threads, tasks }) {
  return withPool(ECHO, threads, undefined, async (pool) => {
    const started = performance.now()
    await Promise.all(Array.from({ length: tasks }, () => pool.run(0)))
    const elapsed = performance.now() - started
    return { ms: elapsed, perSecond: Math.round((tasks / elapsed) * 1000) }
  })
}

async function measureLatency({ threads, tasks }) {
  return withPool(ECHO, threads, undefined, async (pool) => {
    const samples = []
    for (let i = 0; i < Math.min(tasks, 200); i++) {
      const started = performance.now()
      await pool.run(0)
      samples.push(performance.now() - started)
    }
    return { ms: median(samples) }
  })
}

async function measureRpc({ threads, tasks }) {
  const invoke = async () => 'transformed'
  return withPool(CALLS_BACK, threads, invoke, async (pool) => {
    const count = Math.min(tasks, 1000)
    const started = performance.now()
    await Promise.all(Array.from({ length: count }, () => pool.run(0)))
    const elapsed = performance.now() - started
    return { ms: elapsed, perSecond: Math.round((count / elapsed) * 1000) }
  })
}

async function measureBroadcast({ threads }) {
  return withPool(COUNTS, threads, undefined, async (pool) => {
    // Every worker is occupied, so this measures reaching a busy worker rather
    // than an idle one — the case the collector's watcher actually hits.
    const busy = Promise.all(Array.from({ length: threads }, () => pool.run(40)))
    await new Promise(resolve => setTimeout(resolve, 5))
    const started = performance.now()
    pool.broadcast({ kind: 'hst:invalidate', file: '/src/Button.vue' })
    const seen = await busy
    const elapsed = performance.now() - started
    return { ms: elapsed, reached: seen.filter(n => n > 0).length, of: threads }
  })
}

async function measurePayload({ threads, tasks }) {
  return withPool(ECHO, threads, undefined, async (pool) => {
    const count = Math.min(tasks, 2000)
    const payload = storyPayload()
    const started = performance.now()
    await Promise.all(Array.from({ length: count }, () => pool.run(payload)))
    const elapsed = performance.now() - started
    return { ms: elapsed, perSecond: Math.round((count / elapsed) * 1000) }
  })
}

/** A deep queue with broadcasts landing throughout, which is a watcher on a large rebuild. */
async function measureStress({ threads, tasks }) {
  return withPool(ECHO, threads, undefined, async (pool) => {
    const count = tasks * 10
    const started = performance.now()
    const running = Promise.all(Array.from({ length: count }, () => pool.run(0)))
    for (let i = 0; i < count / 10; i++) {
      pool.broadcast({ kind: 'hst:invalidate', file: `/src/File${i}.vue` })
    }
    const results = await running
    const elapsed = performance.now() - started
    return { ms: elapsed, perSecond: Math.round((count / elapsed) * 1000), settled: results.length, of: count }
  })
}

const MEASURES = {
  throughput: measureThroughput,
  latency: measureLatency,
  rpc: measureRpc,
  broadcast: measureBroadcast,
  payload: measurePayload,
}

export async function runCollectPoolBench({ threads = 4, tasks = 2000, runs = 7, stress = false } = {}) {
  const results = {}
  const measures = stress ? { ...MEASURES, stress: measureStress } : MEASURES
  for (const [name, measure] of Object.entries(measures)) {
    const samples = []
    for (let run = 0; run < runs; run++) {
      samples.push(await measure({ threads, tasks }))
    }
    const ms = samples.map(s => s.ms)
    results[name] = {
      ms: median(ms),
      range: range(ms),
      ...(samples[0].perSecond !== undefined ? { perSecond: median(samples.map(s => s.perSecond)) } : {}),
      ...(samples[0].reached !== undefined ? { reached: samples[0].reached, of: samples[0].of } : {}),
      ...(samples[0].settled !== undefined ? { settled: samples[0].settled, of: samples[0].of } : {}),
    }
  }
  if (results.stress) {
    // Under 1 means depth costs throughput, which is the failure this is for.
    results.stress.held = Number((results.stress.perSecond / results.throughput.perSecond).toFixed(2))
  }
  return { threads, tasks, runs, results }
}

function table(report) {
  const rows = Object.entries(report.results).map(([name, r]) => {
    const rate = r.perSecond ? `${r.perSecond}/s` : ''
    const reach = r.reached !== undefined ? `${r.reached}/${r.of} reached` : ''
    const held = r.held !== undefined ? `held ${r.held}x` : (r.settled !== undefined ? `${r.settled}/${r.of} settled` : '')
    return `${name.padEnd(12)} ${`${Math.round(r.ms)}ms`.padStart(8)}  ${rate.padEnd(10)} ${(reach || held).padEnd(18)} range=${r.range.map(n => Math.round(n)).join('–')}`
  })
  return [`threads=${report.threads} tasks=${report.tasks} runs=${report.runs}`, ...rows].join('\n')
}

async function main() {
  const arg = (name, fallback) => {
    const at = process.argv.indexOf(`--${name}`)
    return at === -1 ? fallback : Number(process.argv[at + 1])
  }
  const report = await runCollectPoolBench({
    threads: arg('threads', 4),
    tasks: arg('tasks', 2000),
    runs: arg('runs', 7),
    stress: process.argv.includes('--stress'),
  })
  console.log(process.argv.includes('--json') ? JSON.stringify(report, null, 2) : table(report))
}

// `node -e` leaves `process.argv[1]` undefined, and `smoke.spec.ts` imports this
// to check that, so the guard has to tolerate it (see that file).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
