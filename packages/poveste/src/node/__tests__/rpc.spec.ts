import { MessageChannel } from 'node:worker_threads'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { invokeOver, serveInvoke } from '../collect/rpc.js'

const channels: MessageChannel[] = []

function connect(invoke: (name: string, data: unknown[]) => Promise<unknown>) {
  const channel = new MessageChannel()
  channels.push(channel)
  serveInvoke(channel.port1, invoke)
  return invokeOver(channel.port2)
}

afterEach(() => {
  for (const channel of channels.splice(0)) {
    channel.port1.close()
    channel.port2.close()
  }
})

describe('invokeOver', () => {
  it('returns what the server answers', async () => {
    const invoke = connect(async (name, data) => ({ name, data }))

    const result = await invoke('fetchModule', ['/src/Button.vue'])

    expect(result).toEqual({ name: 'fetchModule', data: ['/src/Button.vue'] })
  })

  it('rejects with the error the server threw', async () => {
    const invoke = connect(async () => {
      throw new Error('transform failed')
    })

    await expect(invoke('fetchModule', ['/src/Broken.vue'])).rejects.toThrow('transform failed')
  })

  it('matches each answer to its own call when several are in flight', async () => {
    // Imports resolve concurrently, so a slower answer arriving second must
    // not settle the call that was sent first.
    const invoke = connect(async (_, [delay, value]) => {
      await new Promise(resolve => setTimeout(resolve, delay as number))
      return value
    })

    const results = await Promise.all([invoke('fetchModule', [30, 'slow']), invoke('fetchModule', [0, 'fast'])])

    expect(results).toEqual(['slow', 'fast'])
  })
})

describe('sharing the channel with task dispatch', () => {
  it('ignores a message that is not its own', async () => {
    // The channel carries task dispatch too (#1020), so anything untagged or
    // tagged for the pool has to fall through both ends untouched.
    const channel = new MessageChannel()
    channels.push(channel)
    const served: string[] = []
    serveInvoke(channel.port1, async (name) => {
      served.push(name)
      return 'ok'
    })
    const invoke = invokeOver(channel.port2)

    channel.port2.postMessage({ kind: 'pvt:task', payload: 1 })
    channel.port2.postMessage({ nothing: true })
    const answered = await invoke('fetchModule', ['/src/Button.vue'])

    expect(answered).toBe('ok')
    expect(served, 'a foreign message reached the invoke server').toEqual(['fetchModule'])
  })

  it('drops a response for a call it is no longer holding', async () => {
    const channel = new MessageChannel()
    channels.push(channel)
    const invoke = invokeOver(channel.port2)

    // An id nothing is waiting on, answered before any real call.
    channel.port1.postMessage({ kind: 'pvt:invoked', id: 99, result: 'stray' })
    serveInvoke(channel.port1, async () => 'real')

    await expect(invoke('fetchModule', [])).resolves.toBe('real')
  })
})

describe('the answer that never comes', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects rather than holding its worker forever', async () => {
    // A stuck transform must fail the story instead of keeping a worker busy.
    vi.useFakeTimers()
    const channel = new MessageChannel()
    channels.push(channel)
    const invoke = invokeOver(channel.port2)

    const call = invoke('fetchModule', ['/src/Stuck.vue'])
    const settled = expect(call).rejects.toThrow(/got no answer in 60s/)
    await vi.advanceTimersByTimeAsync(60_000)

    await settled
  })
})

describe('a call that throws something falsy', () => {
  // The response carries `error` only when the call threw, so presence is the
  // question. Read as truthiness, a thrown `undefined` came back as a *result* —
  // and the runner takes a result where a module should be.
  it('rejects when the server throws undefined', async () => {
    const invoke = connect(async () => {
      // eslint-disable-next-line no-throw-literal
      throw undefined
    })

    await expect(invoke('fetchModule', ['/src/Button.vue'])).rejects.toBeUndefined()
  })

  it('rejects when the server throws an empty string', async () => {
    const invoke = connect(async () => {
      // eslint-disable-next-line no-throw-literal
      throw ''
    })

    await expect(invoke('fetchModule', ['/src/Button.vue'])).rejects.toBe('')
  })

  it('still resolves an answer that is itself undefined', async () => {
    // The other half: a call that succeeds with nothing must not read as a failure.
    const invoke = connect(async () => undefined)

    await expect(invoke('fetchModule', ['/src/Button.vue'])).resolves.toBeUndefined()
  })
})
