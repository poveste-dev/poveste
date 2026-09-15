import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { SUBJECT_TAGS } from './tag-names.mts'

const SCRIPTS = import.meta.dirname
const SPECS = readdirSync(SCRIPTS).filter(file => /^check-[\w-]+\.spec\.ts$/.test(file))
const PER_CHECK = Object.entries(JSON.parse(readFileSync(join(SCRIPTS, '..', 'package.json'), 'utf8')).scripts as Record<string, string>)
  .flatMap(([name, command]) => {
    const spec = command.match(/--project scripts scripts\/(check-[\w-]+\.spec)\b/)?.[1]
    return spec ? [{ name, file: `${spec}.ts` }] : []
  })

function checkTagLists(file: string): string[][] {
  return [...readFileSync(join(SCRIPTS, file), 'utf8').matchAll(/\btags: \[([^\]]*)\]/g)]
    .map(match => [...match[1].matchAll(/'([\w-]+)'/g)].map(tag => tag[1]))
    .filter(tags => tags.includes('check'))
}

const CHECK_TESTS = SPECS.flatMap(file => checkTagLists(file).map(tags => ({ file, tags })))

// A subject filter skips a check with no subject tag, and the run stays green.
it.for(CHECK_TESTS)('a check test in $file carries a subject tag', ({ tags }) => {
  expect(tags.filter(tag => tag in SUBJECT_TAGS)).not.toHaveLength(0)
})

// A per-check script filters its spec to `check`. If the test lost that tag,
// the script would select a file with nothing to run.
it.for(PER_CHECK)('$name selects a check test in $file', ({ file }) => {
  expect(checkTagLists(file)).not.toHaveLength(0)
})
