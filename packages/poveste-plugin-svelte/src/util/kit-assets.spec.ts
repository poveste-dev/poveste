import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import { svelteKitAssetsDir } from './kit-assets.js'

const made: string[] = []

afterEach(() => {
  for (const dir of made.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function project({ manifest, config }: { manifest: Record<string, any>, config?: string }) {
  const dir = mkdtempSync(join(tmpdir(), 'poveste-kit-'))
  made.push(dir)
  writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest))
  if (config != null) {
    writeFileSync(join(dir, 'svelte.config.js'), config)
  }
  return dir
}

describe('a sveltekit project\'s assets directory', () => {
  it('is static when the config does not say otherwise', async () => {
    const dir = project({ manifest: { devDependencies: { '@sveltejs/kit': '^2.55.0' } } })

    await expect(svelteKitAssetsDir(dir)).resolves.toBe(join(dir, 'static'))
  })

  it('is what svelte.config.js sets it to', async () => {
    const dir = project({
      manifest: { devDependencies: { '@sveltejs/kit': '^2.55.0' } },
      config: 'export default { kit: { files: { assets: "public-assets" } } }',
    })

    await expect(svelteKitAssetsDir(dir)).resolves.toBe(join(dir, 'public-assets'))
  })

  it('falls back to static when the config cannot be loaded', async () => {
    const dir = project({
      manifest: { devDependencies: { '@sveltejs/kit': '^2.55.0' } },
      config: 'this is not valid javascript (',
    })

    await expect(svelteKitAssetsDir(dir)).resolves.toBe(join(dir, 'static'))
  })
})

describe('a project that is not sveltekit', () => {
  /*
   * The manifest is the whole test. Asking the module resolver instead reports
   * Kit for a plain Svelte project, because resolution walks up out of the
   * project and finds a sibling's copy in the workspace store — which pointed a
   * Svelte book's `publicDir` at a `static/` it does not have, losing the
   * `public/` it does.
   */
  it('has no assets directory even when svelte is a dependency', async () => {
    const dir = project({ manifest: { devDependencies: { svelte: '^5.55.0' } } })

    await expect(svelteKitAssetsDir(dir)).resolves.toBeUndefined()
  })

  it('has no assets directory when there is no manifest to read', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'poveste-kit-'))
    made.push(dir)

    await expect(svelteKitAssetsDir(dir)).resolves.toBeUndefined()
  })
})
