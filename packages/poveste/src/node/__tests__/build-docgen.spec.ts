import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const FIXTURE = path.resolve(__dirname, './dev-docgen')
const BIN = path.resolve(__dirname, '../../../bin.mjs')

// The build's half of #1159: no reader to wait for, so each story's named
// components are extracted once and shipped in a chunk of their own.
describe('auto-docs in poveste build', () => {
  it('extracts each story\'s components once and ships them in the book', () => {
    const work = mkdtempSync(path.join(tmpdir(), 'poveste-docgen-build-'))
    const marker = path.join(work, 'created.log')
    const outDir = path.join(FIXTURE, '.poveste', 'dist')
    try {
      const result = spawnSync(process.execPath, [BIN, 'build'], {
        cwd: FIXTURE,
        encoding: 'utf8',
        env: { ...process.env, POVESTE_DOCGEN_MARKER: marker },
        timeout: 120_000,
      })
      expect(result.status, result.stderr).toBe(0)

      const assets = path.join(outDir, 'assets')
      const shipped = readdirSync(assets).filter(file => file.endsWith('.js')).filter(file => readFileSync(path.join(assets, file), 'utf8').includes('"button.comp.js"'))
      expect(shipped, 'no chunk carries the extracted docs').toHaveLength(1)
      expect(readFileSync(marker, 'utf8')).toBe('created\n')
    }
    finally {
      rmSync(work, { recursive: true, force: true })
      rmSync(path.join(FIXTURE, '.poveste'), { recursive: true, force: true })
    }
  }, 180_000)
})
