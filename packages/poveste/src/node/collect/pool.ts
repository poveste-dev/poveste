import type { Invoke } from './runner.js'
import { Worker } from 'node:worker_threads'
import { deserializeError } from './error.js'
import { serveInvoke } from './rpc.js'

/*
 * The collector's worker pool (#1020). It replaced `@akryum/tinypool`, a fork
 * whose last publish was 0.3.1 and whose option types were derived by matching
 * the shape of `MessagePort.postMessage`, so a Node types bump broke the build.
 *
 * One channel per worker rather than one port per task. Tasks, results and the
 * worker's `invoke` calls all ride the worker's own port, which is what removes
 * the ordering hazard #557 worked around: a broadcast and a task dispatched on
 * two different channels had nothing sequencing them.
 */

export const TASK = 'pvt:task'
export const DONE = 'pvt:done'
export const FAILED = 'pvt:failed'

interface Task<P, R> {
  payload: P
  resolve: (value: R) => void
  reject: (reason: unknown) => void
}

export interface PoolOptions {
  /** The worker entrypoint. */
  filename: string | URL
  threads: number
  /** Answers the `invoke` calls workers make while they run. */
  invoke: Invoke
}

export interface Pool<P, R> {
  run: (payload: P) => Promise<R>
  /** Sends a message to every worker, whatever each one is doing. */
  broadcast: (message: unknown) => void
  destroy: () => Promise<void>
}

export function createPool<P, R>(options: PoolOptions): Pool<P, R> {
  const queue: Task<P, R>[] = []
  const idle: WorkerHandle[] = []
  const workers: WorkerHandle[] = []
  let destroyed = false

  interface WorkerHandle {
    worker: Worker
    current: Task<P, R> | undefined
  }

  for (let i = 0; i < options.threads; i++) {
    const worker = new Worker(options.filename, { stdout: false, stderr: false })
    const handle: WorkerHandle = { worker, current: undefined }

    serveInvoke(worker, options.invoke)

    worker.on('message', (message: { kind?: string, result?: R, error?: unknown }) => {
      if (message?.kind !== DONE && message?.kind !== FAILED) {
        return
      }
      const task = handle.current
      if (!task) {
        return
      }
      handle.current = undefined
      if (message.kind === DONE) {
        task.resolve(message.result as R)
      }
      else {
        task.reject(deserializeError(message.error))
      }
      release(handle)
    })

    // A worker that dies takes its task with it. Without this the story's
    // promise never settles and the build hangs rather than failing.
    worker.on('error', (error) => {
      const task = handle.current
      handle.current = undefined
      task?.reject(error)
      drop(handle)
    })
    worker.on('exit', () => {
      const task = handle.current
      handle.current = undefined
      task?.reject(new Error('[poveste] a collection worker exited before its story finished'))
      drop(handle)
    })

    workers.push(handle)
    idle.push(handle)
  }

  function drop(handle: WorkerHandle) {
    remove(workers, handle)
    remove(idle, handle)
    // Nothing is left to run the queue, so fail it rather than let it wait.
    if (workers.length === 0) {
      for (const task of queue.splice(0)) {
        task.reject(new Error('[poveste] every collection worker is gone'))
      }
    }
  }

  function remove(list: WorkerHandle[], handle: WorkerHandle) {
    const at = list.indexOf(handle)
    if (at !== -1) {
      list.splice(at, 1)
    }
  }

  function release(handle: WorkerHandle) {
    const next = queue.shift()
    if (next) {
      dispatch(handle, next)
    }
    else {
      idle.push(handle)
    }
  }

  function dispatch(handle: WorkerHandle, task: Task<P, R>) {
    handle.current = task
    handle.worker.postMessage({ kind: TASK, payload: task.payload })
  }

  function run(payload: P) {
    return new Promise<R>((resolve, reject) => {
      if (destroyed) {
        reject(new Error('[poveste] the collection pool is destroyed'))
        return
      }
      const task: Task<P, R> = { payload, resolve, reject }
      const handle = idle.shift()
      if (handle) {
        dispatch(handle, task)
      }
      else {
        queue.push(task)
      }
    })
  }

  function broadcast(message: unknown) {
    for (const handle of workers) {
      handle.worker.postMessage(message)
    }
  }

  async function destroy() {
    destroyed = true
    await Promise.all(workers.slice().map(handle => handle.worker.terminate()))
  }

  return { run, broadcast, destroy }
}
