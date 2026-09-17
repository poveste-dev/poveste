import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `devCommand` wires watchers to restarts; the server and the config behind them
// are what the other dev specs cover. Faked here, a restart can be held mid-start.
const mocks = vi.hoisted(() => ({
  createServer: vi.fn(),
  watchers: [] as (import('node:events').EventEmitter & { file: string, closed: boolean })[],
}))

vi.mock('../context.js', () => ({ createContext: async () => ({}) }))
vi.mock('../server.js', () => ({ createServer: mocks.createServer }))
vi.mock('../config.js', () => ({ resolveConfigFile: async () => '/book/poveste.config.ts' }))
vi.mock('chokidar', () => ({
  default: {
    watch: (file: string) => {
      const watcher = Object.assign(new EventEmitter(), {
        file,
        closed: false,
        close: async () => {
          watcher.closed = true
        },
      })
      mocks.watchers.push(watcher)
      return watcher
    },
  },
}))

const { devCommand } = await import('../commands/dev.js')

function server() {
  return { server: { printUrls: () => {} }, viteConfigFile: '/book/vite.config.ts', close: vi.fn(async () => {}) }
}

/** Saves `file`, as the watchers still open on it would report. */
function save(file: string) {
  for (const watcher of mocks.watchers.filter(watcher => watcher.file === file && !watcher.closed)) {
    watcher.emit('change')
  }
}

describe('poveste dev restarts', () => {
  beforeEach(() => {
    mocks.watchers.length = 0
    mocks.createServer.mockReset()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('still restart on a Vite config save after a restart on it failed', async () => {
    mocks.createServer
      .mockResolvedValueOnce(server())
      .mockRejectedValueOnce(new Error('vite.config.ts saved half-written'))
      .mockResolvedValueOnce(server())
    const { stop } = await devCommand({})

    save('/book/vite.config.ts')
    await vi.waitFor(() => expect(console.error).toHaveBeenCalled())
    save('/book/vite.config.ts')

    await vi.waitFor(() => expect(mocks.createServer).toHaveBeenCalledTimes(3))
    await stop()
  })

  it('stop a server a restart in flight goes on to start', async () => {
    const restarted = server()
    let finishStart = () => {}
    mocks.createServer
      .mockResolvedValueOnce(server())
      .mockReturnValueOnce(new Promise((resolve) => {
        finishStart = () => resolve(restarted)
      }))
    const { stop } = await devCommand({})

    save('/book/poveste.config.ts')
    await vi.waitFor(() => expect(mocks.createServer).toHaveBeenCalledTimes(2))
    const stopping = stop()
    finishStart()
    await stopping

    expect(restarted.close).toHaveBeenCalledOnce()
  })
})
