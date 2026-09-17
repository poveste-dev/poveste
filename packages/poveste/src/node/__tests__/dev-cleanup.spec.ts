import type { ChildProcess } from 'node:child_process'
import type { AddressInfo } from 'node:net'
import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { afterEach, describe, expect, it, vi } from 'vitest'

const FIXTURE = path.resolve(__dirname, './dev-cleanup')
const BIN = path.resolve(__dirname, '../../../bin.mjs')

let child: ChildProcess | undefined

afterEach(() => {
  child?.kill('SIGKILL')
  child = undefined
})

/** How many times a cleanup registered while the config resolved has run. */
function cleanupsRun(marker: string): number {
  return existsSync(marker) ? readFileSync(marker, 'utf8').split('\n').filter(Boolean).length : 0
}

/** A port nothing holds, asked of the OS rather than guessed: a guess can land on a busy one. */
async function freePort(): Promise<number> {
  const probe = createServer()
  await new Promise<void>(resolve => probe.listen(0, 'localhost', resolve))
  const { port } = probe.address() as AddressInfo
  await new Promise(resolve => probe.close(resolve))
  return port
}

function startDev(marker: string, port: number) {
  child = spawn(process.execPath, [BIN, 'dev', '--port', String(port)], {
    cwd: FIXTURE,
    env: { ...process.env, POVESTE_CLEANUP_MARKER: marker, POVESTE_NO_FORCE_EXIT: '1' },
    stdio: 'pipe',
  })
  const process_ = child
  let output = ''
  const collect = (chunk: string) => {
    output += stripVTControlCharacters(chunk)
  }
  process_.stdout?.setEncoding('utf8').on('data', collect)
  process_.stderr?.setEncoding('utf8').on('data', collect)
  const exited = new Promise<number | null>(resolve => process_.on('exit', resolve))
  return { output: () => output, exited, port }
}

// Against a real `poveste dev`, not a unit: the cleanup running too early looked
// fine to everything short of a server that was still serving (#866).
describe('poveste dev runs the process cleanups when the server stops', () => {
  // Windows has no SIGINT to deliver: `kill` there ends the process outright, so the
  // handler this exercises cannot run.
  it.skipIf(process.platform === 'win32')('not while it serves, before a config restart, and on SIGINT', async () => {
    const marker = path.join(mkdtempSync(path.join(tmpdir(), 'poveste-cleanup-')), 'marker')
    const dev = startDev(marker, await freePort())

    await vi.waitFor(() => expect(dev.output()).toContain('Collect stories end'), { timeout: 60_000, interval: 250 })
    expect(cleanupsRun(marker), dev.output()).toBe(0)

    // A change is only seen once the config watcher is past its first scan, and the
    // config is put back only after exit: restoring it is a second change.
    await new Promise(resolve => setTimeout(resolve, 1500))
    const config = path.join(FIXTURE, 'poveste.config.ts')
    const original = readFileSync(config, 'utf8')
    try {
      appendFileSync(config, '\n')
      await vi.waitFor(() => expect(dev.output().split('restarting...')[1]).toContain('Collect stories end'), { timeout: 60_000, interval: 250 })
      expect(cleanupsRun(marker), dev.output()).toBe(1)

      child?.kill('SIGINT')
      expect(await dev.exited).toBe(130)
      expect(cleanupsRun(marker), dev.output()).toBe(2)
    }
    finally {
      writeFileSync(config, original)
    }
  }, 150_000)

  // A config saved mid-edit does not load. The restart it triggers fails, and the
  // save that fixes it has to bring the server back rather than be ignored.
  it('keeps watching after a restart whose config does not load', async () => {
    const marker = path.join(mkdtempSync(path.join(tmpdir(), 'poveste-cleanup-')), 'marker')
    const dev = startDev(marker, await freePort())
    await vi.waitFor(() => expect(dev.output()).toContain('Collect stories end'), { timeout: 60_000, interval: 250 })
    await new Promise(resolve => setTimeout(resolve, 1500))

    const config = path.join(FIXTURE, 'poveste.config.ts')
    const original = readFileSync(config, 'utf8')
    try {
      writeFileSync(config, `throw new Error('a config saved half-written')\n${original}`)
      await vi.waitFor(() => expect(dev.output()).toContain('Error while loading'), { timeout: 60_000, interval: 250 })

      writeFileSync(config, original)
      await vi.waitFor(() => expect(dev.output().split('Error while loading')[1]).toContain('Collect stories end'), { timeout: 60_000, interval: 250 })
    }
    finally {
      writeFileSync(config, original)
    }
  }, 150_000)

  it('when the start fails, as well', async () => {
    const marker = path.join(mkdtempSync(path.join(tmpdir(), 'poveste-cleanup-')), 'marker')
    const holder = createServer()
    await new Promise<void>(resolve => holder.listen(0, 'localhost', resolve))

    try {
      const dev = startDev(marker, (holder.address() as AddressInfo).port)

      expect(await dev.exited, dev.output()).toBe(1)
      expect(cleanupsRun(marker), dev.output()).toBe(1)
    }
    finally {
      await new Promise(resolve => holder.close(resolve))
    }
  }, 60_000)
})
