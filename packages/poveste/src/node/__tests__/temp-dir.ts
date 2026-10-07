import { mkdtempSync, rmSync } from 'node:fs'

/**
 * `fs.mkdtempDisposableSync`'s shape, which these specs were written against.
 * It arrived in Node 24.4, below the supported floor since #1226.
 */
export function tempDir(prefix: string): { path: string, remove: () => void } {
  const path = mkdtempSync(prefix)
  return { path, remove: () => rmSync(path, { recursive: true, force: true }) }
}
