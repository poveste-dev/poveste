import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createPool, DONE, FAILED, TASK } from './pool.js'

const dir = mkdtempSync(join(tmpdir(), 'poveste-pool-'))
const pools: { destroy: () => Promise<void> }[] = []

/** Writes a worker that answers on the same protocol the collector's does. */
function workerFile(name: string, body: string) {
  const file = join(dir, `${name}.mjs`)
  writeFileSync(file, `
import { parentPort } from 'node:worker_threads'
const TASK = ${JSON.stringify(TASK)}
const DONE = ${JSON.stringify(DONE)}
const FAILED = ${JSON.stringify(FAILED)}
${body}
`)
  return new URL(`file://${file}`)
}

function pool<P, R>(filename: URL, threads = 1, invoke: (name: string, data: unknown[]) => Promise<unknown> = async () => undefined) {
  const created = createPool<P, R>({ filename, threads, invoke })
  pools.push(created)
  return created
}

afterEach(async () => {
  await Promise.all(pools.splice(0).map(p => p.destroy()))
})

describe('createPool', () => {
  it('returns what the worker answers', async () => {
    const file = workerFile('echo', `
      parentPort.on('message', (m) => {
        if (m?.kind !== TASK) return
        parentPort.postMessage({ kind: DONE, result: { got: m.payload } })
      })
    `)

    const result = await pool<string, { got: string }>(file).run('Button.story.vue')

    expect(result).toEqual({ got: 'Button.story.vue' })
  })

  it('rejects with the error the worker reports', async () => {
    const file = workerFile('throws', `
      parentPort.on('message', (m) => {
        if (m?.kind !== TASK) return
        parentPort.postMessage({ kind: FAILED, error: new Error('transform failed') })
      })
    `)

    await expect(pool(file).run('Broken.story.vue')).rejects.toThrow('transform failed')
  })

  it('queues past the thread count and matches each answer to its own task', async () => {
    // Two threads, four stories: the last two wait, and a slower story finishing
    // after a faster one must not settle the faster one's call.
    const file = workerFile('slow', `
      parentPort.on('message', async (m) => {
        if (m?.kind !== TASK) return
        await new Promise(r => setTimeout(r, m.payload.delay))
        parentPort.postMessage({ kind: DONE, result: m.payload.name })
      })
    `)
    const created = pool<{ name: string, delay: number }, string>(file, 2)

    const results = await Promise.all([
      created.run({ name: 'a', delay: 40 }),
      created.run({ name: 'b', delay: 0 }),
      created.run({ name: 'c', delay: 20 }),
      created.run({ name: 'd', delay: 0 }),
    ])

    expect(results).toEqual(['a', 'b', 'c', 'd'])
  })

  it('answers the `invoke` calls a worker makes while it runs', async () => {
    const file = workerFile('invokes', `
      let nextId = 0
      const pending = new Map()
      parentPort.on('message', (m) => {
        if (m?.kind === 'pvt:invoked') {
          pending.get(m.id)?.(m.result)
          pending.delete(m.id)
          return
        }
        if (m?.kind !== TASK) return
        const id = nextId++
        pending.set(id, (result) => parentPort.postMessage({ kind: DONE, result }))
        parentPort.postMessage({ kind: 'pvt:invoke', id, name: 'fetchModule', data: [m.payload] })
      })
    `)

    const result = await pool<string, string>(file, 1, async (name, data) => `${name}:${data[0]}`).run('/src/Button.vue')

    expect(result).toBe('fetchModule:/src/Button.vue')
  })

  it('reaches a worker that is busy, not only the idle ones', async () => {
    // Every worker is occupied when the broadcast goes out, and each reports what
    // it had seen by the time its task ended. A broadcast sent only to idle
    // workers reaches nobody here and comes back as zeroes.
    const file = workerFile('counts', `
      let seen = 0
      parentPort.on('message', async (m) => {
        if (m?.kind === 'hst:invalidate') { seen++; return }
        if (m?.kind !== TASK) return
        await new Promise(r => setTimeout(r, m.payload))
        parentPort.postMessage({ kind: DONE, result: seen })
      })
    `)
    const created = pool<number, number>(file, 2)

    const busy = Promise.all([created.run(50), created.run(50)])
    // Both workers are mid-task by now, so neither is on the idle list.
    await new Promise(resolve => setTimeout(resolve, 10))
    created.broadcast({ kind: 'hst:invalidate', file: '/src/Button.vue' })

    expect(await busy).toEqual([1, 1])
  })

  it('rejects the task of a worker that dies rather than leaving it pending', async () => {
    // The failure that matters: without this the story's promise never settles
    // and the build hangs instead of reporting anything.
    const file = workerFile('exits', `
      parentPort.on('message', (m) => {
        if (m?.kind !== TASK) return
        process.exit(1)
      })
    `)

    await expect(pool(file).run('Button.story.vue')).rejects.toThrow(/exited before its story finished|every collection worker is gone/)
  })

  it('refuses to start work once destroyed', async () => {
    const file = workerFile('idle', `parentPort.on('message', () => {})`)
    const created = pool(file)

    await created.destroy()

    await expect(created.run('Button.story.vue')).rejects.toThrow('destroyed')
  })
})
