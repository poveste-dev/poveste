import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import ignore from 'ignore'
import { glob } from 'tinyglobby'

function toPosix(path: string): string {
  return path.split(sep).join('/')
}

/**
 * Whether a file under `cwd` is git-ignored, the way globby's `gitignore: true`
 * decided it: every `.gitignore` from the repository root down, each pattern
 * relative to its own file. tinyglobby reads none of them (#839).
 */
async function gitIgnoredFilter(cwd: string): Promise<(file: string) => boolean> {
  let root = cwd
  while (!existsSync(join(root, '.git'))) {
    const parent = dirname(root)
    if (parent === root) {
      root = cwd
      break
    }
    root = parent
  }

  const ancestors: string[] = []
  for (let dir = cwd; dir !== root;) {
    dir = dirname(dir)
    ancestors.unshift(join(dir, '.gitignore'))
  }
  // Shallow files first, so a nested `.gitignore` can override its parent.
  const nested = (await glob('**/.gitignore', { cwd, absolute: true, dot: true, ignore: ['**/node_modules/**', '**/.git/**'] }))
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))

  const rules = ignore()
  for (const file of [...ancestors, ...nested]) {
    if (!existsSync(file)) {
      continue
    }
    const base = toPosix(relative(root, dirname(file)))
    for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.trimEnd()
      if (!line || line.startsWith('#')) {
        continue
      }
      const negated = line.startsWith('!')
      let pattern = negated ? line.slice(1) : line
      if (base) {
        // A pattern with a slash before its end is anchored to its own directory;
        // one without matches at any depth below it.
        const anchored = pattern.replace(/\/$/, '').includes('/')
        pattern = anchored ? `${base}/${pattern.replace(/^\//, '')}` : `${base}/**/${pattern}`
      }
      rules.add(negated ? `!${pattern}` : pattern)
    }
  }

  return (file) => {
    const path = toPosix(relative(root, resolve(cwd, file)))
    return !path.startsWith('..') && rules.ignores(path)
  }
}

export async function listComponentFiles(search = '', ignoredPatterns: string[] = [], limit = 10, cwd = process.cwd()) {
  const isIgnored = await gitIgnoredFilter(cwd)
  let files = (await glob('**/*.vue', {
    cwd,
    ignore: [
      'node_modules',
      ...ignoredPatterns,
    ],
  })).filter(file => !isIgnored(file))
  if (search) {
    const searchText = search.toLowerCase()
    files = files.filter(file => file.toLowerCase().includes(searchText))
  }
  return files.slice(0, limit)
}
