// Dependabot skips these packages' majors, and a skipped major gets no pull request,
// so nothing else says when one is released. See #1469 for what each skip is waiting for.
//
// Only Kit is here. h3 is announced by the Nuxt major that runs it, whose own pull request
// isn't skipped, and adapter-auto follows Kit.
//
// Compared with the books rather than a number kept here: a book on the new major is
// what answers the question, and it clears this without anyone remembering to.

import type { CheckResult } from './support/check-result.ts'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const WATCHED = ['@sveltejs/kit']

const major = (version: string) => Number(/\d+/.exec(version)?.[0])

/** The highest major any example declares, or undefined if none declares it. */
export function highestBookMajor(root: string, name: string): number | undefined {
  const majors = readdirSync(join(root, 'examples')).flatMap((book) => {
    let manifest
    try {
      manifest = JSON.parse(readFileSync(join(root, 'examples', book, 'package.json'), 'utf8'))
    }
    catch {
      return []
    }
    const range = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name]
    return range ? [major(range)] : []
  })
  return majors.length ? Math.max(...majors) : undefined
}

export function skippedMajorProblem(name: string, latest: string, books: number | undefined): string | undefined {
  if (books === undefined) {
    return `no example declares ${name}, so nothing says which major is handled`
  }
  return major(latest) > books ? `${name} ${latest} is out, and the newest book is on ${books}` : undefined
}

function latestOf(name: string): string {
  return execFileSync('npm', ['view', name, 'dist-tags.latest'], { encoding: 'utf8' }).trim()
}

export function checkSkippedMajors(root = process.cwd(), latest = latestOf): CheckResult {
  const problems = WATCHED.flatMap((name) => {
    const problem = skippedMajorProblem(name, latest(name), highestBookMajor(root, name))
    return problem ? [problem] : []
  })
  return {
    problems,
    remedy: 'Dependabot skips this major, so nothing else will say so. Decide what #1469 asks: whether the new major gets its own book or replaces one.',
    notes: [],
  }
}
