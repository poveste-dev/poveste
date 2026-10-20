import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const FIXTURE = path.resolve(__dirname, './build-root-paths')
const BIN = path.resolve(__dirname, '../../../bin.mjs')
// The repository, not only the book: here the plugins' own files sit beside the
// book rather than in its `node_modules`, as they do in an installed book.
const MACHINE_PATH = path.resolve(__dirname, '../../../../..')

// A built book is published, and it carried the building machine's paths: the
// whole config with `outDir`, logos and plugin modules, a plugin story's
// `relativePath` and its `file://` imports, and virtual modules' ids (#1383).
describe('a built book', () => {
  it('carries no path of the machine that built it', () => {
    const outDir = path.join(FIXTURE, '.poveste', 'dist')
    try {
      const result = spawnSync(process.execPath, [BIN, 'build'], { cwd: FIXTURE, encoding: 'utf8', timeout: 120_000 })
      expect(result.status, result.stderr).toBe(0)

      const files = readdirSync(outDir, { recursive: true, encoding: 'utf8' })
        .filter(file => statSync(path.join(outDir, file)).isFile())
      const read = (file: string) => readFileSync(path.join(outDir, file), 'utf8')
      const all = files.map(read).join('\n')
      expect(all, 'the plugin story was not built').toContain('Plugin story')
      expect(all, 'the markdown story was not built').toContain('A story that is only markdown')

      expect(files.filter(file => read(file).includes(MACHINE_PATH))).toEqual([])
    }
    finally {
      rmSync(path.join(FIXTURE, '.poveste'), { recursive: true, force: true })
      rmSync(path.join(FIXTURE, 'node_modules'), { recursive: true, force: true })
    }
  }, 180_000)
})
