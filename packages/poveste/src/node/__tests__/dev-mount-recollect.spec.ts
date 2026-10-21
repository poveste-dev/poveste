import type { AddressInfo } from 'node:net'
import { spawn } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { describe, expect, it, vi } from 'vitest'

const FIXTURE = path.resolve(__dirname, './dev-mount-recollect')
const IMPORTED = path.join(FIXTURE, 'sizes.js')
const BIN = path.resolve(__dirname, '../../../bin.mjs')
const ENDED = 'Collect stories end'

async function freePort(): Promise<number> {
  const probe = createServer()
  await new Promise<void>(resolve => probe.listen(0, 'localhost', resolve))
  const { port } = probe.address() as AddressInfo
  await new Promise(resolve => probe.close(resolve))
  return port
}

/** The HMR socket a page opens, so the test can send what a page load sends. */
async function connect(port: number) {
  const client = await (await fetch(`http://localhost:${port}/@vite/client`)).text()
  const token = client.match(/const wsToken = "([^"]+)"/)?.[1]
  const socket = new WebSocket(`ws://localhost:${port}/?token=${token}`, 'vite-hmr')
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve)
    socket.addEventListener('error', reject)
  })
  return {
    mount: () => socket.send(JSON.stringify({ type: 'custom', event: 'poveste:mount', data: {} })),
    close: () => socket.close(),
  }
}

// A real `poveste dev`: the mount handler and the watcher it reads are the dev
// server's own.
describe('a page load in poveste dev', () => {
  it('re-collects only when a file changed since the last load', async () => {
    const original = readFileSync(IMPORTED, 'utf8')
    const port = await freePort()
    const child = spawn(process.execPath, [BIN, 'dev', '--port', String(port)], { cwd: FIXTURE, stdio: 'pipe' })
    let output = ''
    const collect = (chunk: string) => {
      output += stripVTControlCharacters(chunk)
    }
    child.stdout.setEncoding('utf8').on('data', collect)
    child.stderr.setEncoding('utf8').on('data', collect)
    const collections = () => output.split(ENDED).length - 1

    try {
      await vi.waitFor(() => expect(collections()).toBe(1), { timeout: 60_000, interval: 100 })
      const page = await connect(port)

      // The first load follows the start-up collection, which it never repeats.
      page.mount()
      page.mount()
      // An absence: given the time a collection of one story takes here, many times over.
      await new Promise(resolve => setTimeout(resolve, 2000))
      expect(collections(), 'a load with nothing changed collected the book again').toBe(1)

      appendFileSync(IMPORTED, '\n')
      await new Promise(resolve => setTimeout(resolve, 500))
      page.mount()
      await vi.waitFor(() => expect(collections()).toBe(2), { timeout: 30_000, interval: 100 })
        .catch(() => {
          throw new Error(`a load after an imported module changed did not collect. What \`poveste dev\` printed:\n${output}`)
        })
      page.close()
    }
    finally {
      child.kill('SIGKILL')
      writeFileSync(IMPORTED, original)
    }
  }, 120_000)
})
