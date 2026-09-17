import type { AddressInfo } from 'node:net'
import type { Context } from '../context.js'
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer as createNetServer } from 'node:net'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createContext } from '../context.js'
import { createServer } from '../server.js'
import { notifyStoryChange } from '../stories.js'

const FIXTURE = path.resolve(__dirname, './dev-restart')
const MARKDOWN = path.join(FIXTURE, 'restart.story.md')

// Every server's collector reports here, so a handler a closed server left behind
// shows up as a second collection for one edit (#877).
const collected = vi.hoisted(() => vi.fn())
vi.mock('../collect/index.js', () => ({
  useCollectStories: () => ({
    clearCache: () => {},
    executeStoryFile: async (file: unknown) => collected(file),
    destroy: async () => {},
  }),
}))

async function freePort(): Promise<number> {
  const probe = createNetServer()
  await new Promise<void>(resolve => probe.listen(0, 'localhost', resolve))
  const { port } = probe.address() as AddressInfo
  await new Promise(resolve => probe.close(resolve))
  return port
}

const settle = () => new Promise(resolve => setTimeout(resolve, 600))

describe('a dev server restarted twice', () => {
  const original = readFileSync(MARKDOWN, 'utf8')
  let close: (() => Promise<void>) | undefined
  let ctx: Context

  beforeEach(async () => {
    vi.spyOn(process, 'cwd').mockReturnValue(FIXTURE)
    const port = await freePort()
    for (let start = 0; start < 3; start++) {
      await close?.()
      ctx = await createContext({ mode: 'dev' })
      ;({ close } = await createServer(ctx, { port }))
    }
    await settle()
    collected.mockClear()
  })

  afterEach(async () => {
    await close?.()
    close = undefined
    writeFileSync(MARKDOWN, original)
    vi.restoreAllMocks()
  })

  // What Vite's hot-update hook does for a changed story module (vite.ts).
  it('collects a story once when it changes', async () => {
    const [storyFile] = ctx.storyFiles
    expect(storyFile).toBeDefined()
    notifyStoryChange(storyFile)
    await settle()

    expect(collected).toHaveBeenCalledTimes(1)
  })

  it('collects a markdown story once when it is edited', async () => {
    writeFileSync(MARKDOWN, original.replace('First.', 'Second.'))
    await vi.waitFor(() => expect(collected).toHaveBeenCalled(), { timeout: 10_000 })
    await settle()

    expect(collected).toHaveBeenCalledTimes(1)
  })
})
