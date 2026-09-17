import type { WatchCallback } from '@poveste/shared'
import type { FSWatcher } from 'chokidar'
import { resolve } from 'node:path'
import chokidar from 'chokidar'

const EVENTS = ['add', 'change', 'unlink'] as const

export interface ManagedWatches {
  watch: (paths: string | string[], callback: WatchCallback) => () => Promise<void>
  close: () => Promise<void>
}

/**
 * The watchers plugins open through `api.watch`, closed together by whoever owns
 * the dev server.
 *
 * A watch requested after `close` opens nothing. A closed chokidar watcher is
 * reopened by a late `add`, and on macOS that started an fsevents stream nothing
 * closed, which is what held a failed Nuxt build open (#434, #849).
 */
export function createManagedWatches(): ManagedWatches {
  const watchers = new Set<FSWatcher>()
  let closed = false

  return {
    watch(paths, callback) {
      if (closed) {
        return async () => {}
      }
      // chokidar reports a path in the form it was given, and the callback promises
      // an absolute one.
      const watcher = chokidar.watch([paths].flat().map(path => resolve(path)), { ignoreInitial: true })
      for (const event of EVENTS) {
        watcher.on(event, path => callback(event, path))
      }
      watchers.add(watcher)
      return async () => {
        watchers.delete(watcher)
        await watcher.close()
      }
    },

    async close() {
      closed = true
      const open = [...watchers]
      watchers.clear()
      await Promise.all(open.map(watcher => watcher.close()))
    },
  }
}
