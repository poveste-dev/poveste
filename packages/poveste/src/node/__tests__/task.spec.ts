import type { Payload, ReturnData } from '../collect/worker.js'
import { MessageChannel } from 'node:worker_threads'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DONE, FAILED, serveTasks, TASK } from '../collect/task.js'

const channels: MessageChannel[] = []

function served(collect: (payload: Payload) => Promise<ReturnData>, invalidate = vi.fn()) {
  const channel = new MessageChannel()
  channels.push(channel)
  serveTasks(channel.port1, { invalidate, collect })
  return { port: channel.port2, invalidate }
}

function answer(port: MessagePort | import('node:worker_threads').MessagePort) {
  return new Promise<any>((resolve) => {
    port.on('message', resolve)
  })
}

afterEach(() => {
  for (const channel of channels.splice(0)) {
    channel.port1.close()
    channel.port2.close()
  }
})

const storyData = { storyData: [] } as unknown as ReturnData

describe('serveTasks', () => {
  it('answers a task with the id it arrived under', async () => {
    // The pool matches on this id, and a wrong one settles the wrong story.
    const { port } = served(async () => storyData)

    port.postMessage({ kind: TASK, id: 7, payload: {} })

    await expect(answer(port)).resolves.toMatchObject({ kind: DONE, id: 7 })
  })

  it('keeps each answer with its own id when two overlap', async () => {
    // No mutation of the current code fails this — `message` is per-invocation, so
    // the id cannot be crossed today. It pins the property against a refactor that
    // hoists the id, which is the shape of the bug `pool.ts` already had.
    const finish: ((value: ReturnData) => void)[] = []
    const { port } = served(() => new Promise<ReturnData>(resolve => finish.push(resolve)))
    const received: any[] = []
    port.on('message', message => received.push(message))

    port.postMessage({ kind: TASK, id: 1, payload: {} })
    port.postMessage({ kind: TASK, id: 2, payload: {} })
    await vi.waitFor(() => expect(finish).toHaveLength(2))
    finish[1]!(storyData)
    finish[0]!(storyData)
    await vi.waitFor(() => expect(received).toHaveLength(2))

    expect(received.map(m => m.id), 'the second task was answered under the first id').toEqual([2, 1])
  })

  it('reports a failed story under its own id, with the frame carried', async () => {
    const thrown = Object.assign(new Error('Unexpected token'), { frame: '1 | <template>' })
    const { port } = served(async () => {
      throw thrown
    })

    port.postMessage({ kind: TASK, id: 3, payload: {} })

    const message = await answer(port)
    expect(message.kind).toBe(FAILED)
    expect(message.id).toBe(3)
    expect(message.error.props.frame, 'the code frame was dropped on the way out').toBe('1 | <template>')
  })

  it('invalidates on a watcher message without answering it', async () => {
    const invalidate = vi.fn()
    const { port } = served(async () => storyData, invalidate)
    const answered = vi.fn()
    port.on('message', answered)

    port.postMessage({ kind: 'hst:invalidate', file: '/src/Button.vue' })
    await vi.waitFor(() => expect(invalidate).toHaveBeenCalledWith('/src/Button.vue'))

    expect(answered, 'a broadcast was answered as though it were a task').not.toHaveBeenCalled()
  })

  it('leaves a message that is not its own alone', async () => {
    // The port carries `invoke` traffic too, which `rpc.ts` answers.
    const collect = vi.fn(async () => storyData)
    const { port } = served(collect)

    port.postMessage({ kind: 'pvt:invoke', id: 0, name: 'fetchModule', data: [] })
    port.postMessage({ nothing: true })
    port.postMessage({ kind: TASK, id: 9, payload: {} })

    await expect(answer(port)).resolves.toMatchObject({ id: 9 })
    expect(collect).toHaveBeenCalledTimes(1)
  })
})
