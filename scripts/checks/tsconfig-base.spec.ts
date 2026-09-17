import { describe, expect, it } from 'vitest'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'
import { checkTsconfigBase, HELD_BY_NAME, packageTsconfigs, reachesBase, unexplainedRelaxations } from './tsconfig-base.ts'

const BASE = '{ "compilerOptions": { "strict": true } }\n'
const SCRIPTS_EXTENDS_BASE = '{ "extends": "../tsconfig.base.json" }'
const EXTENDS_BASE = '{\n  // a comment the parser has to skip\n  "extends": "../../tsconfig.base.json",\n  "compilerOptions": { "outDir": "dist", },\n}\n'

describe('packageTsconfigs', () => {
  it('finds every tsconfig directly in a package, build variants included', () => {
    const root = tree({
      'packages/one/tsconfig.json': EXTENDS_BASE,
      'packages/one/tsconfig.build.json': '{ "extends": "./tsconfig.json" }',
      'packages/one/src/tsconfig.json': '{}',
      'packages/two/package.json': '{}',
    })

    expect(packageTsconfigs(root)).toEqual(['packages/one/tsconfig.build.json', 'packages/one/tsconfig.json'])
  })
})

describe('reachesBase', () => {
  it('accepts a package that extends the base', () => {
    const root = tree({ 'tsconfig.base.json': BASE, 'packages/one/tsconfig.json': EXTENDS_BASE })

    expect(reachesBase('packages/one/tsconfig.json', root)).toBe(true)
  })

  it('accepts a build tsconfig that reaches the base through its package\'s own', () => {
    const root = tree({
      'tsconfig.base.json': BASE,
      'packages/one/tsconfig.json': EXTENDS_BASE,
      'packages/one/tsconfig.build.json': '{ "extends": "./tsconfig.json" }',
    })

    expect(reachesBase('packages/one/tsconfig.build.json', root)).toBe(true)
  })

  it('rejects a package with its own copy of the options', () => {
    const root = tree({ 'tsconfig.base.json': BASE, 'packages/one/tsconfig.json': '{ "compilerOptions": { "strict": true } }' })

    expect(reachesBase('packages/one/tsconfig.json', root)).toBe(false)
  })

  it('rejects a package extending a shared config from a dependency instead', () => {
    const root = tree({ 'tsconfig.base.json': BASE, 'packages/one/tsconfig.json': '{ "extends": "@vue/tsconfig/tsconfig.json" }' })

    expect(reachesBase('packages/one/tsconfig.json', root)).toBe(false)
  })
})

describe('unexplainedRelaxations', () => {
  it('reports a strictness flag switched off with no reason', () => {
    expect(unexplainedRelaxations('{\n  "compilerOptions": {\n    "noImplicitAny": false\n  }\n}\n')).toEqual(['noImplicitAny'])
  })

  it('accepts one with an issue number on the line above', () => {
    expect(unexplainedRelaxations('{\n  // generated code, see #123\n  "noUncheckedIndexedAccess": false\n}\n')).toEqual([])
  })

  it('accepts one with an issue number on the same line', () => {
    expect(unexplainedRelaxations('{ "strictPropertyInitialization": false // #45\n}\n')).toEqual([])
  })

  it('does not count a comment with no issue number as a reason', () => {
    expect(unexplainedRelaxations('{\n  // too many errors\n  "strict": false\n}\n')).toEqual(['strict'])
  })

  it('leaves settings that are not about strictness to the package', () => {
    expect(unexplainedRelaxations('{ "declaration": false, "sourceMap": false }')).toEqual([])
  })
})

describe('checkTsconfigBase', () => {
  it('reports that it found no package tsconfig to hold', () => {
    const root = tree({ 'tsconfig.base.json': BASE, 'packages/': '' })

    expect(checkTsconfigBase(root).problems).toEqual([expect.stringContaining('no package tsconfig')])
  })

  it('reports a missing base rather than failing every package on it', () => {
    const root = tree({ 'packages/one/tsconfig.json': EXTENDS_BASE })

    expect(checkTsconfigBase(root).problems).toEqual(['tsconfig.base.json is missing, and 1 package tsconfigs are meant to extend it'])
  })

  it('names each package that drifted, and why', () => {
    const root = tree({
      'tsconfig.base.json': BASE,
      'scripts/tsconfig.json': SCRIPTS_EXTENDS_BASE,
      'packages/one/tsconfig.json': EXTENDS_BASE,
      'packages/two/tsconfig.json': '{ "compilerOptions": { "noImplicitAny": false } }',
    })

    expect(checkTsconfigBase(root).problems).toEqual([
      'packages/two/tsconfig.json does not extend tsconfig.base.json, so it checks at whatever level its own copy says',
      'packages/two/tsconfig.json sets `noImplicitAny` to false with no issue number saying why',
    ])
  })

  it('holds the scripts\' tsconfig to the base too, which no walk of packages/ reaches', () => {
    const root = tree({
      'tsconfig.base.json': BASE,
      'scripts/tsconfig.json': '{ "compilerOptions": { "strict": true } }',
      'packages/one/tsconfig.json': EXTENDS_BASE,
    })

    expect(HELD_BY_NAME).toContain('scripts/tsconfig.json')
    expect(checkTsconfigBase(root).problems).toEqual([
      'scripts/tsconfig.json does not extend tsconfig.base.json, so it checks at whatever level its own copy says',
    ])
  })

  it('reports a named tsconfig that is gone rather than holding nothing', () => {
    const root = tree({ 'tsconfig.base.json': BASE, 'packages/one/tsconfig.json': EXTENDS_BASE })

    expect(checkTsconfigBase(root).problems).toEqual([
      'scripts/tsconfig.json is gone, and this check still holds it by name — take it out of HELD_BY_NAME if that was meant',
    ])
  })

  it('every package tsconfig extends the base and keeps strictness on', { tags: ['check', 'toolchain'] }, () => {
    assertNoProblems(checkTsconfigBase())
  })
})
