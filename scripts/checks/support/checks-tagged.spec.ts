import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { captured } from './captured.ts'
import { SUBJECT_TAGS } from './tag-names.mts'

const SCRIPTS = join(import.meta.dirname, '..', '..')
const CHECKS = join(SCRIPTS, 'checks')
const SPECS = readdirSync(CHECKS).filter(file => file.endsWith('.spec.ts'))
const PACKAGE_SCRIPTS = JSON.parse(readFileSync(join(SCRIPTS, '..', 'package.json'), 'utf8')).scripts as Record<string, string>
const PER_CHECK = Object.entries(PACKAGE_SCRIPTS)
  .flatMap(([name, command]) => {
    const module = command.match(/--project scripts checks\/([\w-]+)/)?.[1]
    return module ? [{ name, file: `${module}.spec.ts` }] : []
  })

function checkTagLists(file: string): string[][] {
  return [...readFileSync(join(CHECKS, file), 'utf8').matchAll(/\btags: \[([^\]]*)\]/g)]
    .map(match => [...captured(match).matchAll(/'([\w-]+)'/g)].map(tag => captured(tag)))
    .filter(tags => tags.includes('check'))
}

const CHECK_TESTS = SPECS.flatMap(file => checkTagLists(file).map(tags => ({ file, tags })))

// The tags `test:checks` excludes, read from its own filter so the two cannot disagree.
const TEST_CHECKS = PACKAGE_SCRIPTS['test:checks']
if (TEST_CHECKS === undefined) {
  throw new Error('package.json has no `test:checks` script to read the excluded tags from')
}
const EXCLUDED_BY_TEST_CHECKS = [...TEST_CHECKS.matchAll(/!([\w-]+)/g)].map(match => captured(match))
const SELECTED_BY_TEST_CHECKS = [...new Set(CHECK_TESTS
  .filter(({ tags }) => !tags.some(tag => EXCLUDED_BY_TEST_CHECKS.includes(tag)))
  .map(({ file }) => file.replace(/\.spec\.ts$/, '')))].sort()

/**
 * The checks `release:check` runs before the build, through `test:checks`.
 *
 * Named because the tag filter selects them: a check test that gains `build` or
 * `network` leaves the release gate while every other run stays green. Adding
 * or removing one here is the deliberate step that change needs.
 */
const RELEASE_GATE_CHECKS = [
  'config-reference',
  'conformance-config',
  'docs-svelte-fences',
  'example-wiring',
  'local-tags',
  'mirrored-conformance',
  'node-versions',
  'package-tests',
  'preview-position',
  'readmes',
  'recipes',
  'step-gates',
  'task-graph',
  'tsconfig-base',
  'versions',
]

// A subject filter skips a check with no subject tag, and the run stays green.
it.for(CHECK_TESTS)('a check test in $file carries a subject tag', ({ tags }) => {
  expect(tags.filter(tag => tag in SUBJECT_TAGS)).not.toHaveLength(0)
})

// A per-check script filters its spec to `check`. If the test lost that tag,
// the script would select a file with nothing to run.
it.for(PER_CHECK)('$name selects a check test in $file', ({ file }) => {
  expect(checkTagLists(file)).not.toHaveLength(0)
})

it('test:checks selects exactly the checks release:check runs before the build', () => {
  expect(SELECTED_BY_TEST_CHECKS).toEqual(RELEASE_GATE_CHECKS)
})
