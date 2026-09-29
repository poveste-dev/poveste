/*
 * What `pool.bench.ts` and `rpc.bench.ts` both need: workers that answer on the
 * pool's protocol, and a pool warmed so spawn is not part of a measurement.
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createPool, DONE, TASK } from '../../collect/pool.js'

export const RPC_REQUEST = 'pvt:invoke'
export const RPC_RESPONSE = 'pvt:invoked'

export const THREADS = 4

/** A build hands the pool every story at once, so a queue is the normal path. */
export const QUEUED = THREADS * 4

/** Long enough for tinybench's margin of error to settle under a percent. */
export const TIME_MS = 500

const dir = mkdtempSync(join(tmpdir(), 'poveste-bench-pool-'))

export function workerFile(name: string, body: string) {
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
export const ECHO = workerFile('echo', `
  parentPort.on('message', (m) => {
    if (m?.kind !== TASK) return
    parentPort.postMessage({ kind: DONE, result: 1 })
  })
`)

/**
 * Answers directly on payload `0` and calls back first on `1`, so both shapes can
 * be measured against each other on one pool, adjacently. Measured on two pools in
 * sequence the ratio drifts with whatever the machine did in between, which is
 * what it exists to rule out.
 */
export const EITHER = workerFile('either', `
  let nextId = 0
  const pending = new Map()
  parentPort.on('message', (m) => {
    if (m?.kind === RPC_RESPONSE) { pending.get(m.id)?.(); pending.delete(m.id); return }
    if (m?.kind !== TASK) return
    if (!m.payload) { parentPort.postMessage({ kind: DONE, result: 1 }); return }
    const id = nextId++
    pending.set(id, () => parentPort.postMessage({ kind: DONE, result: 1 }))
    parentPort.postMessage({ kind: RPC_REQUEST, id, name: 'fetchModule', data: ['/src/Button.vue'] })
  })
`)

/** The collector hands its worker a file record, not a scalar. */
export const STORY_PAYLOAD = {
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

export const noInvoke = async () => undefined

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

/** `withPool`, for a body whose value the caller needs. */
export async function withPoolResult<T>(filename: URL, invoke: (name: string, data: unknown[]) => Promise<unknown>, body: (pool: ReturnType<typeof createPool>) => Promise<T>): Promise<T> {
  let value!: T
  await withPool(filename, invoke, async (pool) => {
    value = await body(pool)
  })
  return value
}
