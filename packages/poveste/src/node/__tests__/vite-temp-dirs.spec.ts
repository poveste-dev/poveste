import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { viteTempDirs } from './support/vite-temp-dirs.js'
import { tempDir } from './temp-dir.js'

describe('the Vite temp dirs the suite removes', () => {
  const dirs: { remove: () => void }[] = []
  afterEach(() => {
    dirs.splice(0).forEach(dir => dir.remove())
  })

  function fixtures(...paths: string[]): string {
    const dir = tempDir(path.join(tmpdir(), 'poveste-vite-temp-'))
    dirs.push(dir)
    for (const relative of paths) {
      mkdirSync(path.join(dir.path, relative), { recursive: true })
    }
    return dir.path
  }

  it('are the half-written bundles in each fixture\'s client and server caches', () => {
    const root = fixtures('dev-server/node_modules/.pvt-vite/deps_temp_6e6c92a2', 'dev-restart/node_modules/.pvt-vite-server/deps_temp_910b3e49')

    expect(viteTempDirs(root).map(dir => path.relative(root, dir)).sort()).toEqual([
      path.join('dev-restart', 'node_modules', '.pvt-vite-server', 'deps_temp_910b3e49'),
      path.join('dev-server', 'node_modules', '.pvt-vite', 'deps_temp_6e6c92a2'),
    ])
  })

  it('leave a committed cache alone, which the next run reuses', () => {
    const root = fixtures('dev-restart/node_modules/.pvt-vite/deps')

    expect(viteTempDirs(root)).toEqual([])
  })
})
