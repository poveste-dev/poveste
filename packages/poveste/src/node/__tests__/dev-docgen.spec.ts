import type { AddressInfo } from 'node:net'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { describe, expect, it, vi } from 'vitest'
import { hmrPortFor } from '../commands/port.js'

const FIXTURE = path.resolve(__dirname, './dev-docgen')
const BIN = path.resolve(__dirname, '../../../bin.mjs')

async function freePort(): Promise<number> {
  const probe = createServer()
  await new Promise<void>(resolve => probe.listen(0, 'localhost', resolve))
  const { port } = probe.address() as AddressInfo
  await new Promise(resolve => probe.close(resolve))
  return port
}

// A real `poveste dev`, because extraction runs in a worker thread only the built
// package has. The acceptance line of #1159: no extractor, and so no type checker,
// exists until a reader asks for a story's docs.
describe('auto-docs in poveste dev', () => {
  it('creates no extractor through collection, and one on the first request', async () => {
    const marker = path.join(mkdtempSync(path.join(tmpdir(), 'poveste-docgen-')), 'created.log')
    const port = await freePort()
    const child = spawn(process.execPath, [BIN, 'dev', '--port', String(port)], {
      cwd: FIXTURE,
      stdio: 'pipe',
      env: { ...process.env, POVESTE_DOCGEN_MARKER: marker },
    })
    let output = ''
    const collect = (chunk: string) => {
      output += stripVTControlCharacters(chunk)
    }
    child.stdout.setEncoding('utf8').on('data', collect)
    child.stderr.setEncoding('utf8').on('data', collect)

    try {
      await vi.waitFor(() => expect(output).toContain('Collect stories end'), { timeout: 60_000, interval: 100 })
      await new Promise(resolve => setTimeout(resolve, 500))
      expect(existsSync(marker), 'an extractor was created before anyone asked').toBe(false)

      const socket = new WebSocket(`ws://localhost:${hmrPortFor(port)}`, 'vite-hmr')
      await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
      const result = new Promise<any>((resolve) => {
        socket.addEventListener('message', (event) => {
          const message = JSON.parse(String(event.data))
          if (message.event === 'poveste:docgen-result') resolve(message.data)
        })
      })
      socket.send(JSON.stringify({ type: 'custom', event: 'poveste:docgen-request', data: { storyId: 'button' } }))

      expect(await result).toEqual({
        storyId: 'button',
        components: { 'button.comp.js': { doc: { props: [{ name: 'button.comp.js', type: 'string', required: false, tags: [] }], slots: [], events: [] } } },
      })
      expect(readFileSync(marker, 'utf8')).toBe('created\n')
      socket.close()
    }
    finally {
      child.kill('SIGKILL')
    }
  }, 120_000)
})
