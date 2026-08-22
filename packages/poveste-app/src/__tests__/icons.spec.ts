import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(__dirname, '../..')
const script = resolve(packageRoot, 'scripts/icons.mjs')
const generated = resolve(packageRoot, 'src/app/util/icons.generated.ts')

describe('bundled chrome icons', () => {
  // Run as a child process rather than imported: the generator is plain ESM
  // with `import.meta.url`, which vitest's transform does not leave intact.
  it('icons.generated.ts matches the icons the sources use', () => {
    // A stale file means an Icon the chrome renders is missing from the bundle
    // and falls back to a CDN fetch at runtime — exactly what bundling is for.
    expect(() => execFileSync('node', [script, '--check'], { stdio: 'pipe' })).not.toThrow()
  })

  it('carries the icons the chrome is known to use', () => {
    const source = readFileSync(generated, 'utf8')
    expect(source).toContain('"prefix":"carbon"')
    expect(source).toContain('"cube":')
    expect(source).toContain('"search":')
    expect(source).toContain('"subtract-line":')
  })
})
