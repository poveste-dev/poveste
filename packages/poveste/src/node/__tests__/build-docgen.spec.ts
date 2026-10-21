import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
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

  // A JS-only book that upgraded and deployed published "Cannot find module
  // 'typescript'" under every component, with the build machine's paths (#1382).
  it('ships no extractor error, and no path of the machine that built it', () => {
    const work = mkdtempSync(path.join(tmpdir(), 'poveste-docgen-build-'))
    const outDir = path.join(FIXTURE, '.poveste', 'dist')
    try {
      const result = spawnSync(process.execPath, [BIN, 'build'], {
        cwd: FIXTURE,
        encoding: 'utf8',
        env: { ...process.env, POVESTE_DOCGEN_MARKER: path.join(work, 'created.log'), POVESTE_DOCGEN_FAIL: '1' },
        timeout: 120_000,
      })
      expect(result.status, result.stderr).toBe(0)

      const files = readdirSync(outDir, { recursive: true, encoding: 'utf8' })
        .filter(file => statSync(path.join(outDir, file)).isFile())
      const read = (file: string) => readFileSync(path.join(outDir, file), 'utf8')
      const docsData = files.filter(file => /component-docs-data[-_].*\.js$/.test(file))
      expect(docsData, 'no docs data was emitted to check').not.toHaveLength(0)
      expect(docsData.filter(file => read(file).includes(FIXTURE))).toEqual([])
      expect(files.filter(file => /Require stack|Cannot find module 'typescript'/.test(read(file)))).toEqual([])
      expect(result.stdout + result.stderr).toContain('auto-docs could not read 1 component')
    }
    finally {
      rmSync(work, { recursive: true, force: true })
      rmSync(path.join(FIXTURE, '.poveste'), { recursive: true, force: true })
    }
  }, 180_000)
})
