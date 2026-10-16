import type { AddressInfo } from 'node:net'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import path from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { describe, expect, it, vi } from 'vitest'

const FIXTURE = path.resolve(__dirname, './dev-setup-file-error')
const BIN = path.resolve(__dirname, '../../../bin.mjs')

async function freePort(): Promise<number> {
  const probe = createServer()
  await new Promise<void>(resolve => probe.listen(0, 'localhost', resolve))
  const { port } = probe.address() as AddressInfo
  await new Promise(resolve => probe.close(resolve))
  return port
}

async function collectionOutput(env: Record<string, string> = {}) {
  const child = spawn(process.execPath, [BIN, 'dev', '--port', String(await freePort())], { cwd: FIXTURE, stdio: 'pipe', env: { ...process.env, ...env } })
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
    return output
  }
  finally {
    child.kill('SIGKILL')
  }
}

// A real `poveste dev`, because the setup file is imported in the collection
// worker, which only the built package has. Each story used to report the setup
// file's error as its own, and the setup file was named nowhere (#1324).
describe('a setup file that fails to load', () => {
  it('is reported once, by its own path, and no story is blamed for it', async () => {
    const output = await collectionOutput()

    expect(output.match(/Error while loading the setup file \S*setup\.js/g)).toHaveLength(1)
    expect(output).toContain('missing.css')
    expect(output).not.toContain('Error while collecting story')
  }, 120_000)

  it('leaves a story that throws on its own to be reported as that story', async () => {
    const output = await collectionOutput({ FIXTURE_SETUP_FILE: './setup-that-loads.js' })

    expect(output).toMatch(/Error while collecting story \S*broken\.story\.mjs/)
    expect(output).toContain('this story throws on its own')
    expect(output).not.toContain('Error while loading the setup file')
  }, 120_000)
})
