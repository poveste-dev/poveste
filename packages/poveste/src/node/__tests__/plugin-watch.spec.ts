import type { FSWatcher } from 'chokidar'
import type { Context } from '../context.js'
import { resolve } from 'node:path'
import chokidar from 'chokidar'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BuildPluginApi, DevPluginApi } from '../plugin.js'
import { createManagedWatches } from '../util/managed-watches.js'

const ctx = {} as Context
const plugin = { name: 'watching' }
const moduleLoader = { clearCache: () => {}, loadModule: async () => undefined, destroy: () => {} }

function spyOnWatchers() {
  const opened: FSWatcher[] = []
  const original = chokidar.watch
  vi.spyOn(chokidar, 'watch').mockImplementation((paths, options) => {
    const watcher = original(paths, options)
    opened.push(watcher)
    return watcher
  })
  return opened
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('api.watch', () => {
  it('closes every watcher when the dev server cleans up', async () => {
    const opened = spyOnWatchers()
    const watches = createManagedWatches()
    const api = new DevPluginApi(ctx, plugin, moduleLoader, watches)

    api.watch(__filename, () => {})
    api.watch([__dirname], () => {})
    expect(opened).toHaveLength(2)

    await watches.close()

    expect(opened.map(watcher => watcher.closed)).toEqual([true, true])
  })

  // #849: a closed chokidar watcher reopens on a late `add`, and that leaked.
  it('opens nothing for a watch requested after cleanup', async () => {
    const opened = spyOnWatchers()
    const watches = createManagedWatches()
    await watches.close()

    new DevPluginApi(ctx, plugin, moduleLoader, watches).watch(__filename, () => {})

    expect(opened).toHaveLength(0)
  })

  it('gives a build no watcher at all', () => {
    const opened = spyOnWatchers()

    const stop = new BuildPluginApi(ctx, plugin, moduleLoader).watch(__filename, () => {})

    expect(opened).toHaveLength(0)
    expect(stop).toBeTypeOf('function')
  })

  it('passes the event and path, and logs a failing callback rather than rejecting', async () => {
    const opened = spyOnWatchers()
    const watches = createManagedWatches()
    const api = new DevPluginApi(ctx, plugin, moduleLoader, watches)
    const seen: string[] = []
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

    api.watch(__filename, (event, path) => {
      seen.push(`${event} ${path}`)
      throw new Error('regenerate failed')
    })
    opened[0]!.emit('change', '/a.css')
    await vi.waitFor(() => expect(logged).toHaveBeenCalled())

    expect(seen).toEqual(['change /a.css'])
    expect(String(logged.mock.calls[0]?.[1])).toContain('regenerate failed')
    await watches.close()
  })

  // chokidar reports a path in the form it was given, and the callback promises an absolute one.
  it('watches a relative path as an absolute one', async () => {
    spyOnWatchers()
    const watches = createManagedWatches()

    new DevPluginApi(ctx, plugin, moduleLoader, watches).watch(['theme.css', '/abs/tokens.css'], () => {})

    expect(vi.mocked(chokidar.watch).mock.calls[0]?.[0]).toEqual([resolve('theme.css'), resolve('/abs/tokens.css')])
    await watches.close()
  })

  it('stops one watcher early and leaves the rest to cleanup', async () => {
    const opened = spyOnWatchers()
    const watches = createManagedWatches()
    const api = new DevPluginApi(ctx, plugin, moduleLoader, watches)

    const stop = api.watch(__filename, () => {})
    api.watch(__dirname, () => {})
    await stop()

    expect(opened.map(watcher => watcher.closed)).toEqual([true, false])
    await watches.close()
    expect(opened[1]?.closed).toBe(true)
  })
})
