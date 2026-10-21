import type { AddressInfo } from 'node:net'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import path from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { describe, expect, it, vi } from 'vitest'

const FIXTURE = path.resolve(__dirname, './dev-external-globals')
const BIN = path.resolve(__dirname, '../../../bin.mjs')

async function freePort(): Promise<number> {
  const probe = createServer()
  await new Promise<void>(resolve => probe.listen(0, 'localhost', resolve))
  const { port } = probe.address() as AddressInfo
  await new Promise(resolve => probe.close(resolve))
  return port
}

// A real `poveste dev`, because the reset between stories runs in the collection
// worker, which only the built package has. A Nuxt book compiles a story with
// Vue's HMR code, and once the worker had cleared `__VUE_HMR_RUNTIME__` a story
// collected again after an edit threw on it (#1320).
describe('collecting a second story in the same worker', () => {
  it('still has the globals a dependency installed when it was first imported', async () => {
    const child = spawn(process.execPath, [BIN, 'dev', '--port', String(await freePort())], { cwd: FIXTURE, stdio: 'pipe' })
    let output = ''
    const collect = (chunk: string) => {
      output += stripVTControlCharacters(chunk)
    }
    child.stdout.setEncoding('utf8').on('data', collect)
    child.stderr.setEncoding('utf8').on('data', collect)

    try {
      await vi.waitFor(() => expect(output).toContain('Collect stories end'), { timeout: 60_000, interval: 100 })
        .catch(() => {
          throw new Error(`no collection finished in 60 s. What \`poveste dev\` printed:\n${output}`)
        })

      expect(output).toContain('first.story.js')
      expect(output).toContain('second.story.js')
      // Installed by a module an inlined CommonJS dependency requires (#1404).
      expect(output).toContain('third.story.js')
      expect(output).toContain('fourth.story.js')
      expect(output).not.toContain('Error while collecting story')
    }
    finally {
      child.kill('SIGKILL')
    }
  }, 120_000)
})
