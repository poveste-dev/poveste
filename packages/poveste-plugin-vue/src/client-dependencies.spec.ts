import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLIENT_DEPENDENCIES, HstVue } from './index.node.js'

const SRC = import.meta.dirname

/** Every file the browser loads from this package: the client, and the client half of each command. */
function clientFiles() {
  const client = readdirSync(join(SRC, 'client'), { recursive: true, encoding: 'utf8' }).map(file => join(SRC, 'client', file))
  const commands = readdirSync(join(SRC, 'commands')).filter(file => file.endsWith('.client.ts')).map(file => join(SRC, 'commands', file))
  return [...client, ...commands].filter(file => /\.[cm]?ts$/.test(file) && !/\.spec\.ts$/.test(file) && !file.includes('__tests__'))
}

// Vue is the book's own, the workspace packages are the chrome's, and a virtual module is no package.
const NOT_NPM = /^(?:vue(?:\/|$)|@poveste\/|poveste(?:\/|$)|virtual:|vue-vapor-rc\/)/

describe('the client\'s npm dependencies', () => {
  // A dependency the client imports and the list leaves out is found late on a cold start,
  // and reloads a reader's first page (#1477).
  it('are every package the client code imports, so a new one cannot be left out', () => {
    const imported = new Set<string>()
    for (const file of clientFiles()) {
      for (const [, specifier] of readFileSync(file, 'utf8').matchAll(/^import [^'\n]*'([^'.][^']*)'/gm)) {
        if (!NOT_NPM.test(specifier!)) {
          imported.add(specifier!.startsWith('@') ? specifier!.split('/').slice(0, 2).join('/') : specifier!.split('/')[0]!)
        }
      }
    }

    expect([...imported].sort()).toEqual([...CLIENT_DEPENDENCIES].sort())
  })

  it('are named for the optimizer through this package, which the book can resolve', () => {
    const vite = HstVue().config!({} as never) as { vite: { optimizeDeps: { include: string[] } } }

    expect(vite.vite.optimizeDeps.include).toEqual(['@poveste/plugin-vue > change-case'])
  })
})
