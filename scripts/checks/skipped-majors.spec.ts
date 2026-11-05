import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkSkippedMajors, highestBookMajor, skippedMajorProblem, WATCHED } from './skipped-majors.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

const book = (range: string) => JSON.stringify({ devDependencies: { '@sveltejs/kit': range } })

describe('highestBookMajor', () => {
  it('takes the newest of the books, which is the one a new major is compared with', () => {
    const root = tree({
      'examples/kit2/package.json': book('^2.70.2'),
      'examples/kit3/package.json': book('^3.0.0'),
      'examples/vue/package.json': JSON.stringify({ devDependencies: { vue: '^3.0.0' } }),
      'examples/README.md': 'not a book',
    })

    expect(highestBookMajor(root, '@sveltejs/kit')).toBe(3)
  })

  it('reports no book rather than a major', () => {
    expect(highestBookMajor(tree({ 'examples/vue/package.json': '{}' }), '@sveltejs/kit')).toBeUndefined()
  })
})

describe('skippedMajorProblem', () => {
  it('says nothing while a book is on the latest major', () => {
    expect(skippedMajorProblem('@sveltejs/kit', '3.1.1', 3)).toBeUndefined()
  })

  it('names a release past the newest book', () => {
    expect(skippedMajorProblem('@sveltejs/kit', '4.0.0', 3)).toBe('@sveltejs/kit 4.0.0 is out, and the newest book is on 3')
  })

  it('fails when no book declares the package, rather than passing over it', () => {
    expect(skippedMajorProblem('@sveltejs/kit', '4.0.0', undefined)).toContain('no example declares')
  })
})

describe('checkSkippedMajors', () => {
  it('says what to decide', () => {
    const root = tree({ 'examples/kit3/package.json': book('^3.0.0') })

    const result = checkSkippedMajors(root, () => '4.0.0')

    expect(result.problems).toHaveLength(1)
    expect(result.remedy).toContain('#1469')
  })

  it('watches only what Dependabot really skips', () => {
    const config = readFileSync('.github/dependabot.yml', 'utf8')

    expect(WATCHED.filter(name => !config.includes(`dependency-name: '${name}'`))).toEqual([])
  })

  it('no skipped major has been released past the newest book', { tags: ['check', 'ci', 'network'] }, () => {
    assertNoProblems(checkSkippedMajors())
  })
})
