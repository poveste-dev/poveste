import type { MessagePort } from 'node:worker_threads'
import type { Invoke } from './runner.js'

/*
 * The one call a collection worker makes to the main thread, over the
 * `MessagePort` each task brings. It replaced birpc (#344): after #167 the
 * channel carries a single method, and a dependency that ships in `poveste` was
 * three majors behind to carry it.
 */

// What birpc waited before rejecting a call, kept so a stuck transform still
// fails the story rather than holding its worker forever.
const TIMEOUT_MS = 60_000

interface Request {
  id: number
  name: string
  data: unknown[]
}

interface Response {
  id: number
  result?: unknown
  error?: unknown
}

/** Answers `invoke` requests arriving on `port`. */
export function serveInvoke(port: MessagePort, invoke: Invoke) {
  port.on('message', async ({ id, name, data }: Request) => {
    let response: Response
    try {
      response = { id, result: await invoke(name, data) }
    }
    catch (error) {
      response = { id, error }
    }
    port.postMessage(response)
  })
}

/** An `invoke` that sends its calls over `port`. */
export function invokeOver(port: MessagePort): Invoke {
  let nextId = 0
  const pending = new Map<number, { resolve: (value: unknown) => void, reject: (reason: unknown) => void, timeout: NodeJS.Timeout }>()

  port.on('message', ({ id, result, error }: Response) => {
    const call = pending.get(id)
    if (!call) {
      return
    }
    pending.delete(id)
    clearTimeout(call.timeout)
    if (error) {
      call.reject(error)
    }
    else {
      call.resolve(result)
    }
  })

  return (name, data) => new Promise((resolve, reject) => {
    const id = nextId++
    const timeout = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`[poveste] a collection worker's call to ${name} got no answer in ${TIMEOUT_MS / 1000}s`))
    }, TIMEOUT_MS)
    timeout.unref()
    pending.set(id, { resolve, reject, timeout })
    port.postMessage({ id, name, data } satisfies Request)
  })
}
