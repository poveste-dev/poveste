import type { PortLike } from './rpc.js'
import type { Payload, ReturnData } from './worker.js'
import { serializeError } from './error.js'

/*
 * The task half of what a collection worker answers on its port (#1020). Split
 * from `worker.ts` because that module throws outside a worker thread, which
 * leaves this — where a mis-routed message loses a story — unreachable from a test.
 */

export const TASK = 'pvt:task'
export const DONE = 'pvt:done'
export const FAILED = 'pvt:failed'
/* The watcher's, and older than the rest — the wire value is what `index.ts`
   has always sent. Shared so a rename cannot land on one end only: an unknown
   kind is dropped in silence by design, so a typo here stops invalidation
   without failing anything. */
export const INVALIDATE = 'hst:invalidate'

export interface TaskHandlers {
  invalidate: (file: string) => void
  collect: (payload: Payload) => Promise<ReturnData>
}

/** Answers task dispatch and invalidation arriving on `port`. */
export function serveTasks(port: PortLike, handlers: TaskHandlers) {
  // Invalidations that arrived while a story was running, held until it is not.
  const deferred = new Set<string>()
  let running = false

  port.on('message', (message) => {
    if (message?.kind === INVALIDATE) {
      // Applied mid-story it re-evaluates modules that story is already using,
      // and the two halves of a framework then disagree about which instance is
      // current: Vue injects a key its provider never used, Svelte reads a
      // component context outside any component. The invalidation is for the
      // *next* run of the file anyway, so it waits for one.
      if (running) {
        deferred.add(message.file)
        return
      }
      handlers.invalidate(message.file)
      return
    }
    if (message?.kind !== TASK) {
      return
    }
    const { id } = message
    running = true
    for (const file of deferred) {
      handlers.invalidate(file)
    }
    deferred.clear()
    const settle = () => {
      running = false
    }
    handlers.collect(message.payload as Payload).then(
      (result) => {
        settle()
        port.postMessage({ kind: DONE, id, result })
      },
      (error) => {
        settle()
        port.postMessage({ kind: FAILED, id, error: serializeError(error) })
      },
    )
  })
}
