import type { AddressInfo } from 'node:net'
import { spawn } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { describe, expect, it, vi } from 'vitest'

const FIXTURE = path.resolve(__dirname, './dev-collect-restart')
const CONFIG = path.join(FIXTURE, 'poveste.config.js')
const BIN = path.resolve(__dirname, '../../../bin.mjs')

async function freePort(): Promise<number> {
  const probe = createServer()
  await new Promise<void>(resolve => probe.listen(0, 'localhost', resolve))
  const { port } = probe.address() as AddressInfo
  await new Promise(resolve => probe.close(resolve))
  return port
}

/**
 * Where a restart that did not finish stopped, read from what `poveste dev` printed.
 *
 * The three are different defects. No restart, after ten seconds of saves, is
 * the config watcher not seeing them. A restart with no
 * collection after it is the dev server coming back with no stories, which is
 * what the test exists to catch (#1288).
 */
function stalledAt(output: string): string {
  const afterRestart = output.split('restarting...')[1]
  if (afterRestart === undefined) {
    return 'the config edit never printed `restarting...`'
  }
  const afterCollection = afterRestart.split('story collection')[1]
  if (afterCollection === undefined) {
    return 'the server restarted and never started a story collection'
  }
  return 'the restarted server started a story collection that never printed `Collect stories end`'
}

describe('saying where a restart stalled', () => {
  it.for([
    ['Local: http://localhost:1/\nUsing 4 threads for story collection\n', 'the config edit never printed `restarting...`'],
    ['Local:\nconfig changed, restarting...\nLocal:\n', 'the server restarted and never started a story collection'],
    ['Local:\nrestarting...\nUsing 4 threads for story collection\n', 'the restarted server started a story collection that never printed `Collect stories end`'],
  ] as const)('reads %j as "%s"', ([output, stage]) => {
    expect(stalledAt(output)).toBe(stage)
  })
})

// A real `poveste dev`, because collection runs in worker threads that only the
// built package has. The fixture's one story takes three seconds to import, so a
// config edit made once collection starts lands while it is in flight (#878).
describe('restarting poveste dev while stories are being collected', () => {
  it('stops that collection without reporting the shutdown as a story error', async () => {
    const original = readFileSync(CONFIG, 'utf8')
    const child = spawn(process.execPath, [BIN, 'dev', '--port', String(await freePort())], { cwd: FIXTURE, stdio: 'pipe' })
    let output = ''
    // CI prints in colour, and an escape code inside `Local:` would hide it from a plain match.
    const collect = (chunk: string) => {
      output += stripVTControlCharacters(chunk)
    }
    child.stdout.setEncoding('utf8').on('data', collect)
    child.stderr.setEncoding('utf8').on('data', collect)

    try {
      // The thread count is printed when the first collection starts, and the
      // slow story then keeps it in flight for three seconds.
      await vi.waitFor(() => expect(output).toContain('story collection'), { timeout: 60_000, interval: 100 })

      const edited = output.length
      // One save, a fixed second after `Local:`, timed out once in #1288 with no
      // restart printed, and nothing could say whether the save was missed. This
      // spec is about a restart during collection, so it saves until the server
      // says it is restarting, and then checks the collection was still running.
      await vi.waitFor(() => {
        if (!output.includes('restarting...')) {
          appendFileSync(CONFIG, '\n')
        }
        expect(output).toContain('restarting...')
      }, { timeout: 10_000, interval: 250 })
        .catch(() => {
          throw new Error(`${stalledAt(output)}, 10 s of saving the config. What \`poveste dev\` printed:\n${output}`)
        })
      expect(output.split('restarting...')[0], 'the slow story finished before the restart, so nothing was in flight').not.toContain('Collect stories end')
      // The restarted server's own collection, which starts after it prints its thread count.
      await vi.waitFor(() => expect(output.split('restarting...')[1]?.split('story collection')[1]).toContain('Collect stories end'), { timeout: 60_000, interval: 100 })
        .catch(() => {
          throw new Error(`${stalledAt(output)}, 60 s after the edit. What \`poveste dev\` printed:\n${output}`)
        })

      const restart = output.slice(edited)
      expect(restart).not.toContain('Error while collecting story')
      expect(restart).not.toContain('The server is being restarted or closed')
    }
    finally {
      child.kill('SIGKILL')
      writeFileSync(CONFIG, original)
    }
  }, 120_000)
})
