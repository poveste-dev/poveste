/**
 * @module-tag docs
 * @module-tag build
 */
import process from 'node:process'
import { expect, it } from 'vitest'
import { checkDocCoverage } from '../check-doc-coverage.ts'

it('every published entrypoint is measured for doc comments', () => {
  const { broken, report } = checkDocCoverage()
  process.stdout.write(`${report.join('\n')}\n`)
  expect(broken, 'Usually this is an unbuilt tree — run `pnpm run build` first. A partial run reports a plausible percentage over a fraction of the surface rather than an obvious zero.').toEqual([])
})
