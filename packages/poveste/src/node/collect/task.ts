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
export const INVALIDATE_ALL = 'pvt:invalidate-all'

export interface TaskHandlers {
  invalidate: (file: string) => void
  invalidateAll: () => void
  collect: (payload: Payload) => Promise<ReturnData>
}

/** Answers task dispatch and invalidation arriving on `port`. */
export function serveTasks(port: PortLike, handlers: TaskHandlers) {
  // Invalidations that arrived while a story was running, held until none is.
  const deferred = new Set<string>()
  let dropEverything = false
  // A count rather than a flag: nothing here stops a second task arriving before
  // the first settles — the pool sends one at a time, and the spec beside this
  // one drives two deliberately — and under a flag the second task's own drain
  // would invalidate modules the first is still holding, which is the thing this
  // whole file is arranging not to do.
  let running = 0

  port.on('message', (message) => {
    // Sent once per collection pass, when the server clears its own cache. Every
    // module is read again either way; applying it here rather than one module at
    // a time as each is next asked for is what stops a run straddling the two.
    if (message?.kind === INVALIDATE_ALL) {
      if (running > 0) {
        dropEverything = true
        return
      }
      handlers.invalidateAll()
      return
    }
    if (message?.kind === INVALIDATE) {
      // Applied mid-story it re-evaluates modules that story is already using,
      // and the two halves of a framework then disagree about which instance is
      // current: Vue injects a key its provider never used, Svelte reads a
      // component context outside any component. The invalidation is for the
      // *next* run of the file anyway, so it waits for one.
      if (running > 0) {
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
    // Only with the graph to itself: a task starting beside another cannot take
    // modules out from under it.
    if (running === 0) {
      if (dropEverything) {
        dropEverything = false
        deferred.clear()
        handlers.invalidateAll()
      }
      for (const file of deferred) {
        handlers.invalidate(file)
      }
      deferred.clear()
    }
    running++
    const settle = () => {
      running--
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
