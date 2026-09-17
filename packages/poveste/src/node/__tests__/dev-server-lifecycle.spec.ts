import type { FSWatcher } from 'chokidar'
import type { AddressInfo } from 'node:net'
import { spawn } from 'node:child_process'
import { createServer as createNetServer } from 'node:net'
import path from 'node:path'
import chokidar from 'chokidar'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createContext } from '../context.js'
import { createServer } from '../server.js'

// Collection runs its worker from `dist`, which a spec importing `src` has not got,
// and this is about what the server opens and closes, not what it collects.
vi.mock('../collect/index.js', () => ({
  useCollectStories: () => ({ clearCache: () => {}, executeStoryFile: async () => {}, destroy: async () => {} }),
}))

const FIXTURE = path.resolve(__dirname, './dev-server')
const BIN = path.resolve(__dirname, '../../../bin.mjs')

async function holdPort(): Promise<{ port: number, release: () => Promise<void> }> {
  const holder = createNetServer()
  // `localhost`, where this fixture's Vite binds: macOS lets a more specific address
  // share a port held on every interface, so that would take nothing.
  await new Promise<void>(resolve => holder.listen(0, 'localhost', resolve))
  const { port } = holder.address() as AddressInfo
  return { port, release: () => new Promise(resolve => holder.close(() => resolve())) }
}

async function freePort(): Promise<number> {
  const { port, release } = await holdPort()
  await release()
  return port
}

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

describe('the dev server lifecycle', () => {
  beforeEach(() => {
    vi.spyOn(process, 'cwd').mockReturnValue(FIXTURE)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('leaves no watcher open across restarts', async () => {
    const opened = spyOnWatchers()
    const port = await freePort()

    for (let restart = 0; restart < 3; restart++) {
      const { close } = await createServer(await createContext({ mode: 'dev' }), { port })
      await close()
    }

    expect(opened.length).toBeGreaterThanOrEqual(3)
    expect(opened.filter(watcher => !watcher.closed)).toHaveLength(0)
  })

  it('closes what it opened when the start fails', async () => {
    const opened = spyOnWatchers()
    const { port, release } = await holdPort()

    try {
      await expect(createServer(await createContext({ mode: 'dev' }), { port })).rejects.toThrow(/already in use/)
    }
    finally {
      await release()
    }

    expect(opened.length).toBeGreaterThan(0)
    expect(opened.filter(watcher => !watcher.closed)).toHaveLength(0)
  })
})

// The forced exit in bin.ts hides a leak by design, so this turns it off: a start
// that fails and leaks is a hang again, and a hang is what this measures (#867).
describe('poveste dev on a port that is taken', () => {
  it('exits on its own, with nothing left holding the process', async () => {
    const { port, release } = await holdPort()

    try {
      const child = spawn(process.execPath, [BIN, 'dev', '--port', String(port)], {
        cwd: FIXTURE,
        env: { ...process.env, POVESTE_NO_FORCE_EXIT: '1' },
        stdio: 'pipe',
      })
      let output = ''
      const collect = (chunk: string) => {
        output += chunk
      }
      child.stdout.setEncoding('utf8').on('data', collect)
      child.stderr.setEncoding('utf8').on('data', collect)

      const exit = await new Promise<number | null | 'hung'>((resolve) => {
        const timer = setTimeout(resolve, 45_000, 'hung')
        child.on('exit', (code) => {
          clearTimeout(timer)
          resolve(code)
        })
      })
      if (exit === 'hung') {
        child.kill('SIGKILL')
      }

      expect(output).toContain('already in use')
      expect(exit, output.slice(-2000)).toBe(1)
    }
    finally {
      await release()
    }
  }, 60_000)
})
