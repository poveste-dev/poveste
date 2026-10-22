import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const FIXTURE = path.resolve(__dirname, './build-consumer-postcss')
const BIN = path.resolve(__dirname, '../../../bin.mjs')

// Tailwind 3 refused the chrome's compiled `@layer utilities`, so a book on it could not
// build (#1433). The fixture's plugin refuses it the same way.
describe('a book whose PostCSS config rejects the chrome\'s stylesheets', () => {
  it('builds, with the book\'s own CSS still processed by it', () => {
    const outDir = path.join(FIXTURE, '.poveste', 'dist')
    try {
      const result = spawnSync(process.execPath, [BIN, 'build'], { cwd: FIXTURE, encoding: 'utf8', timeout: 120_000 })
      expect(result.status, result.stderr).toBe(0)

      const css = readdirSync(outDir, { recursive: true, encoding: 'utf8' }).filter(file => file.endsWith('.css')).map(file => readFileSync(path.join(outDir, file), 'utf8')).join('\n')
      expect(css).toContain('.book-marker')
      expect(css).toContain('processed')
      expect(css).not.toContain('@tailwind utilities')
    }
    finally {
      rmSync(path.join(FIXTURE, '.poveste'), { recursive: true, force: true })
    }
  }, 180_000)
})
