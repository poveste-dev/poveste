import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { listComponentFiles } from './list-components.js'

const roots: string[] = []

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'list-components-'))
  roots.push(root)
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

// Listing honoured .gitignore through globby's `gitignore: true`, and tinyglobby
// has no such option, so the filtering is ours now (#839).
describe('listComponentFiles', () => {
  it('leaves out components git ignores, from the root .gitignore and a nested one', async () => {
    const root = tree({
      '.git/HEAD': 'ref: refs/heads/main\n',
      '.gitignore': 'generated/\n',
      'app/.gitignore': 'scratch/*\n!scratch/Kept.svelte\n',
      'app/src/Button.svelte': '',
      'app/src/generated/Output.svelte': '',
      'app/scratch/Draft.svelte': '',
      'app/scratch/Kept.svelte': '',
    })

    const files = await listComponentFiles('', [], 10, join(root, 'app'))

    expect(files.sort()).toEqual(['scratch/Kept.svelte', 'src/Button.svelte'])
  })

  it('still skips node_modules and the patterns it is given', async () => {
    const root = tree({
      '.git/HEAD': 'ref: refs/heads/main\n',
      'src/Button.svelte': '',
      'src/Button.story.svelte': '',
      'node_modules/pkg/Dep.svelte': '',
    })

    expect(await listComponentFiles('', ['**/*.story.svelte'], 10, root)).toEqual(['src/Button.svelte'])
  })
})
