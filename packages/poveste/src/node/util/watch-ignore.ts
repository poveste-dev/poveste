import type { Stats } from 'node:fs'
import micromatch from 'micromatch'

// chokidar 4 passes absolute paths, so `**` must cross dot segments (`.claude/`, `node_modules/.pnpm`).
const options = { dot: true }

export function createWatchIgnore(ignored: string[], included: string[]) {
  return (path: string, stats?: Stats): boolean => {
    if (micromatch.isMatch(path, ignored, options)) return true
    if (micromatch.isMatch(path, included, options)) return false
    return stats?.isFile() ?? false
  }
}
