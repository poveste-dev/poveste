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

    const problems = surfaceProblems(built, RECORDED)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^poveste exports `processDefaultConfig`, which is not in scripts\/checks\/entry-exports\.json\./)
    expect(problems[0]).toContain('add it to that file under "poveste"')
    expect(problems[0]).toContain('import it from a module the entrypoint does not re-export')
  })

  it('names a recorded export that is gone', () => {
    const built = { ...RECORDED, poveste: ['defineConfig'] }

    const problems = surfaceProblems(built, RECORDED)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^poveste no longer exports `resolveConfig`, which scripts\/checks\/entry-exports\.json records\./)
    expect(problems[0]).toContain('a removal a consumer can see')
    expect(problems[0]).toContain('deprecate it first')
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
