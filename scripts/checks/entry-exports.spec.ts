import { describe, expect, it } from 'vitest'
import { checkEntryExports, declaredEntrypoints, NOT_OURS, RECORD, surfaceProblems } from './entry-exports.ts'
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

describe('the entrypoints a manifest declares', () => {
  // `@poveste/plugin-vue`'s shape: typed entries beside two that point at source.
  it('includes the ones with no types, each with the file it runs', () => {
    const manifest = {
      exports: {
        '.': { types: './dist/index.d.ts', default: './dist/index.js' },
        './client-dev': { default: './src/client.ts' },
        './*': './*',
      },
    }

    expect([...declaredEntrypoints('pkg', manifest)]).toEqual([['pkg', './dist/index.js'], ['pkg/client-dev', './src/client.ts']])
  })

  it('reads a string entry and a bare `main`', () => {
    expect([...declaredEntrypoints('pkg', { exports: { '.': './dist/bundle.js' } })]).toEqual([['pkg', './dist/bundle.js']])
    expect([...declaredEntrypoints('pkg', { main: './index.js' })]).toEqual([['pkg', './index.js']])
  })
})

describe('an entrypoint with no declarations', () => {
  const PACKAGE = JSON.stringify({ name: 'untyped', version: '1.0.0', exports: { '.': './dist/index.js', './gone': './dist/gone.js' } })

  // `@poveste/app` is this: an untyped bundle, which the first version of the
  // check skipped without a word.
  it('is compared from the file it runs', () => {
    const root = tree({
      'packages/untyped/package.json': JSON.stringify({ name: 'untyped', version: '1.0.0', exports: { '.': './dist/index.js' } }),
      'packages/untyped/dist/index.js': 'export const kept = 1\nexport function added() {}\n',
      [RECORD]: JSON.stringify({ untyped: ['kept'] }),
    })

    const { problems } = checkEntryExports(root)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^untyped exports `added`, which is not in /)
  })

  it('fails when its file is not there, rather than leaving it out', () => {
    const root = tree({
      'packages/untyped/package.json': PACKAGE,
      'packages/untyped/dist/index.js': 'export const kept = 1\n',
      [RECORD]: JSON.stringify({ untyped: ['kept'] }),
    })

    const { problems } = checkEntryExports(root)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^untyped\/gone is a declared entrypoint and packages\/untyped\/dist\/gone\.js does not exist, so it was not compared\./)
  })
})

describe('the packages left out by name', () => {
  it('each carry a reason', () => {
    expect(Object.entries(NOT_OURS).filter(([, reason]) => reason.length === 0)).toEqual([])
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
