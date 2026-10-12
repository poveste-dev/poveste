import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import pkg from '../../package.json'

const src = fileURLToPath(new URL('..', import.meta.url))

// What a module pulls in when it runs, followed through relative imports. Type
// imports are erased by the build, so they are not counted.
function packagesLoadedBy(file: string): string[] {
  const found: string[] = []
  for (const statement of readFileSync(file, 'utf8').split(/\n(?=import |export )/)) {
    const [head, specifier] = statement.split('\'')
    if (/^(?:import|export) type /.test(statement) || !/^import $| from $/.test(head!)) {
      continue
    }
    if (specifier!.startsWith('.')) {
      found.push(...packagesLoadedBy(join(dirname(file), specifier!.replace(/\.js$/, '.ts'))))
    }
    else {
      found.push(specifier!)
    }
  }
  return found
}

describe('the entry a setup file imports the helper from', () => {
  // A setup file runs in the page as well as in collection. With one target for
  // both, the page loaded the plugin, `poveste`'s node entry and Vite (#1301).
  it('resolves to the plugin in Node and to the helpers anywhere else', () => {
    expect(pkg.exports['.']).toEqual({
      types: './dist/index.node.d.ts',
      node: './dist/index.node.js',
      default: './dist/index.js',
    })
    expect(Object.keys(pkg.exports['.'])).toEqual(['types', 'node', 'default'])
  })

  it('loads no package in the browser', () => {
    expect(packagesLoadedBy(join(src, 'index.ts'))).toEqual([])
  })

  it('still exports every helper the Node entry does', async () => {
    const browser = await import('../index.js')

    expect(Object.keys(browser).sort()).toEqual(['defineSetupSvelte', 'defineSetupSvelte3', 'defineSetupSvelte4', 'defineSetupSvelte5'])
  })
})
