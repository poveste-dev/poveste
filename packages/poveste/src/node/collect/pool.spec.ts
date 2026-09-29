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

  it('drains a queue many times the worker count without losing a task', async () => {
    // The collector queues every story at once — 63 in the vue book against 11
    // workers — so the queue, not the dispatch, is the normal path.
    const file = workerFile('numbered', `
      parentPort.on('message', (m) => {
        if (m?.kind !== TASK) return
        parentPort.postMessage({ kind: DONE, result: m.payload })
      })
    `)
    const created = pool<number, number>(file, 4)

    const results = await Promise.all(Array.from({ length: 500 }, (_, i) => created.run(i)))

    expect(results).toEqual(Array.from({ length: 500 }, (_, i) => i))
  })

  it('keeps answering while a worker dies under load', async () => {
    // One story in ten takes its worker down. The rest still have to settle, and
    // the pool has to keep dispatching on what is left.
    const file = workerFile('flaky', `
      parentPort.on('message', (m) => {
        if (m?.kind !== TASK) return
        if (m.payload % 10 === 9) process.exit(1)
        parentPort.postMessage({ kind: DONE, result: m.payload })
      })
    `)
    const created = pool<number, number>(file, 6)

    const settled = await Promise.allSettled(Array.from({ length: 60 }, (_, i) => created.run(i)))

    // Every task settles — the failure this guards is one that never does.
    expect(settled).toHaveLength(60)
    expect(settled.every(r => r.status === 'fulfilled' || r.reason instanceof Error)).toBe(true)
    expect(settled.filter(r => r.status === 'fulfilled').length).toBeGreaterThan(0)
  })

  it('settles every task when a broadcast storm runs alongside dispatch', async () => {
    // A watcher firing on a large rebuild interleaves broadcasts with task
    // traffic on the same port, which is the arrangement this pool introduced.
    const file = workerFile('storm', `
      let seen = 0
      parentPort.on('message', (m) => {
        if (m?.kind === 'hst:invalidate') { seen++; return }
        if (m?.kind !== TASK) return
        parentPort.postMessage({ kind: DONE, result: seen })
      })
    `)
    const created = pool<number, number>(file, 4)

    const running = Promise.all(Array.from({ length: 200 }, (_, i) => created.run(i)))
    for (let i = 0; i < 200; i++) {
      created.broadcast({ kind: 'hst:invalidate', file: `/src/File${i}.vue` })
    }
    const results = await running

    expect(results).toHaveLength(200)
    expect(results.every(n => typeof n === 'number')).toBe(true)
  })

  it('settles the whole queue when every task fails', async () => {
    const file = workerFile('all-fail', `
      parentPort.on('message', (m) => {
        if (m?.kind !== TASK) return
        parentPort.postMessage({ kind: FAILED, error: new Error('story ' + m.payload) })
      })
    `)
    const created = pool<number, number>(file, 3)

    const settled = await Promise.allSettled(Array.from({ length: 120 }, (_, i) => created.run(i)))

    expect(settled.every(r => r.status === 'rejected')).toBe(true)
    expect((settled[0] as PromiseRejectedResult).reason.message).toBe('story 0')
  })

  it('settles what is in flight when destroy lands mid-queue', async () => {
    // A build that fails tears the pool down with stories still running (#878).
    // Those have to settle, one way or the other, or the process hangs.
    const file = workerFile('slow-queue', `
      parentPort.on('message', async (m) => {
        if (m?.kind !== TASK) return
        await new Promise(r => setTimeout(r, 30))
        parentPort.postMessage({ kind: DONE, result: m.payload })
      })
    `)
    const created = pool<number, number>(file, 2)

    const running = Promise.allSettled(Array.from({ length: 100 }, (_, i) => created.run(i)))
    await new Promise(resolve => setTimeout(resolve, 20))
    await created.destroy()

    const settled = await running
    expect(settled).toHaveLength(100)
    expect(settled.every(r => r.status === 'fulfilled' || r.status === 'rejected')).toBe(true)
  })

  it('answers a long chain of `invoke` calls from one task', async () => {
    // Collecting one story walks its module graph, so a single task makes many
    // sequential calls over the channel it also received the task on.
    const file = workerFile('chain', `
      let nextId = 0
      const pending = new Map()
      parentPort.on('message', async (m) => {
        if (m?.kind === 'pvt:invoked') { pending.get(m.id)?.(m.result); pending.delete(m.id); return }
        if (m?.kind !== TASK) return
        let last
        for (let i = 0; i < m.payload; i++) {
          const id = nextId++
          last = await new Promise((resolve) => {
            pending.set(id, resolve)
            parentPort.postMessage({ kind: 'pvt:invoke', id, name: 'fetchModule', data: [i] })
          })
        }
        parentPort.postMessage({ kind: DONE, result: last })
      })
    `)
    const created = pool<number, string>(file, 2, async (_, data) => `module-${data[0]}`)

    const results = await Promise.all([created.run(200), created.run(200)])

    expect(results).toEqual(['module-199', 'module-199'])
  })

  it('refuses to start work once destroyed', async () => {
    const file = workerFile('idle', `parentPort.on('message', () => {})`)
    const created = pool(file)

    await created.destroy()

    await expect(created.run('Button.story.vue')).rejects.toThrow('destroyed')
  })
})
