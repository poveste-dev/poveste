import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../..', import.meta.url))
const cli = fileURLToPath(new URL('../../node_modules/@commitlint/cli/cli.js', import.meta.url))

// The `commit-msg` hook's own command, with the message on stdin.
function scopeErrors(subject: string): string[] {
  const { stdout } = spawnSync(process.execPath, [cli], { cwd: root, input: `${subject}\n\nwhy this change was needed, in a body\n`, encoding: 'utf8' })
  return stdout.split('\n').filter(line => line.includes('✖') && line.includes('scope'))
}

describe('the scope of a commit subject', () => {
  it.concurrent.each([
    'test(e2e): hold the story list to the contract',
    'fix(vue3): keep the old scope legal in a revert',
    'fix(plugin-svelte): give the entry a browser build',
    'fix(app,vendors): move one import',
    'fix(docs/stackblitz): pin the starter',
    'fix: a subject with no scope',
  ])('accepts %s', (subject) => {
    expect(scopeErrors(subject)).toEqual([])
  })

  it.concurrent.each([
    'fix(E2E): shout the scope',
    'fix(plugin_vue): use an underscore',
    'fix(pluginVue): use camel case',
    'fix(vue,Svelte): capitalise the second of two',
    'fix(-vue): lead with a hyphen',
  ])('refuses %s', (subject) => {
    expect(scopeErrors(subject)).toHaveLength(1)
  })
})
