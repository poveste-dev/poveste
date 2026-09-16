import { MessageChannel } from 'node:worker_threads'
import { afterEach, describe, expect, it } from 'vitest'
import { invokeOver, serveInvoke } from './rpc.js'

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
