import type { Invoke } from './runner.js'
import { deserializeError, serializeError } from './error.js'

/*
 * The one call a collection worker makes to the main thread. It replaced birpc
 * (#344): after #167 the channel carries a single method, and a dependency that
 * ships in `poveste` was three majors behind to carry it.
 *
 * Task dispatch shares the channel (#1020), so both sides tag what they send.
 */

// What birpc waited before rejecting a call, kept so a stuck transform still
// fails the story rather than holding its worker forever.
const TIMEOUT_MS = 60_000

const REQUEST = 'pvt:invoke'
const RESPONSE = 'pvt:invoked'

/** A `MessagePort` or a `Worker` — the two ends this runs over. */
export interface PortLike {
  on: (event: 'message', listener: (value: any) => void) => unknown
  postMessage: (value: any) => void
}

interface Request {
  kind: typeof REQUEST
  id: number
  name: string
  data: unknown[]
}

interface Response {
  kind: typeof RESPONSE
  id: number
  result?: unknown
  error?: unknown
}

/** Answers `invoke` requests arriving on `port`. */
export function serveInvoke(port: PortLike, invoke: Invoke) {
  port.on('message', async (message: Request) => {
    if (message?.kind !== REQUEST) {
      return
    }
    const { id, name, data } = message
    let response: Response
    try {
      response = { kind: RESPONSE, id, result: await invoke(name, data) }
    }
    catch (error) {
      response = { kind: RESPONSE, id, error: serializeError(error) }
    }
    port.postMessage(response)
  })
}

/** An `invoke` that sends its calls over `port`. */
export function invokeOver(port: PortLike): Invoke {
  let nextId = 0
  const pending = new Map<number, { resolve: (value: unknown) => void, reject: (reason: unknown) => void, timeout: NodeJS.Timeout }>()

  port.on('message', (message: Response) => {
    if (message?.kind !== RESPONSE) {
      return
    }
    const { id, result, error } = message
    const call = pending.get(id)
    if (!call) {
      return
    }
    pending.delete(id)
    clearTimeout(call.timeout)
    // Presence rather than truthiness: `serveInvoke` sets the key only when the
    // call threw, and a thrown `undefined` or `''` read as no error at all —
    // resolving the runner with `undefined` where it expects a module.
    if ('error' in message) {
      call.reject(deserializeError(error))
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
    port.postMessage({ kind: REQUEST, id, name, data } satisfies Request)
  })
}
