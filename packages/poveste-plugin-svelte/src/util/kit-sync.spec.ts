import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import { syncSvelteKit } from './kit-sync.js'

let project: string

afterEach(() => {
  rmSync(project, { recursive: true, force: true })
})

// A project and a stand-in for Kit's CLI, which records how it was called.
function makeProject({ declaresKit = true, exitCode = 0 } = {}) {
  project = mkdtempSync(join(tmpdir(), 'kit-sync-'))
  writeFileSync(join(project, 'package.json'), JSON.stringify({ devDependencies: declaresKit ? { '@sveltejs/kit': '^3.0.0' } : {} }))
  const kit = join(project, 'node_modules/@sveltejs/kit')
  mkdirSync(kit, { recursive: true })
  writeFileSync(join(kit, 'package.json'), JSON.stringify({ name: '@sveltejs/kit', bin: { 'svelte-kit': 'svelte-kit.js' }, exports: { './package.json': './package.json' } }))
  writeFileSync(join(kit, 'svelte-kit.js'), `require('node:fs').writeFileSync('synced', process.argv.slice(2).join(' '))\nif (${exitCode}) { console.error('sync broke'); process.exit(${exitCode}) }\n`)
  return project
}

describe('syncSvelteKit', () => {
  it('runs `svelte-kit sync` in a project that declares Kit', () => {
    const cwd = makeProject()

    expect(syncSvelteKit(cwd)).toBeUndefined()
    expect(readFileSync(join(cwd, 'synced'), 'utf8')).toBe('sync')
  })

  it('does nothing in a project that does not', () => {
    const cwd = makeProject({ declaresKit: false })

    syncSvelteKit(cwd)

    expect(existsSync(join(cwd, 'synced'))).toBe(false)
  })

  it('reports a sync that fails rather than throwing', () => {
    const cwd = makeProject({ exitCode: 1 })

    expect(syncSvelteKit(cwd)).toBe('sync broke')
  })
})
