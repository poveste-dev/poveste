import { describe, expect, it } from 'vitest'
import { checkEntryExports, RECORD, surfaceProblems } from './entry-exports.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

const RECORDED = {
  'poveste': ['defineConfig', 'resolveConfig'],
  '@poveste/plugin-nuxt': ['HstNuxt'],
}

describe('comparing the built surface with the record', () => {
  it('passes when they are the same', () => {
    expect(surfaceProblems(RECORDED, RECORDED)).toEqual([])
  })

  // #1291: a helper exported for its spec, on the package's main entry.
  it('names an export nobody recorded', () => {
    const built = { ...RECORDED, poveste: ['defineConfig', 'processDefaultConfig', 'resolveConfig'] }

    expect(surfaceProblems(built, RECORDED)).toEqual(['poveste exports `processDefaultConfig`, which is not recorded'])
  })

  it('names a recorded export that is gone', () => {
    const built = { ...RECORDED, poveste: ['defineConfig'] }

    expect(surfaceProblems(built, RECORDED)).toEqual(['poveste no longer exports `resolveConfig`, which is recorded'])
  })

  it('names an entrypoint with no list, and a list with no entrypoint', () => {
    const built = { 'poveste': RECORDED.poveste, 'poveste/client': ['Story'] }

    expect(surfaceProblems(built, RECORDED)).toEqual([
      `poveste/client is a published entrypoint with no list in ${RECORD}`,
      `${RECORD} lists @poveste/plugin-nuxt, which is not an entrypoint of the built tree`,
    ])
  })
})

describe('the repository', () => {
  it('exports from each published entrypoint exactly what is recorded', { tags: ['check', 'release', 'build'] }, () => {
    const result = checkEntryExports()
    process.stdout.write(`${result.notes.join('\n')}\n`)

    assertNoProblems(result)
  })

  it('reports rather than passes when no entrypoint could be read', () => {
    const root = tree({
      'CONTRIBUTING.md': '',
      'packages/poveste-app/package.json': '{ "name": "@poveste/app", "version": "1.0.0" }\n',
    })

    expect(checkEntryExports(root).problems).toContainEqual(expect.stringContaining('no entrypoint was compared'))
  })
})
