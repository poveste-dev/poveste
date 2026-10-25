import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

export function projectVueVersion(root: string): string | undefined {
  try {
    const manifest = createRequire(join(root, 'package.json')).resolve('vue/package.json')
    return JSON.parse(readFileSync(manifest, 'utf8')).version
  }
  catch {
    return undefined
  }
}
