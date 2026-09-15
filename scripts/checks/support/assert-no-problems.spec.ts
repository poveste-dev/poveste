import { describe, expect, it } from 'vitest'
import { assertNoProblems } from './assert-no-problems.ts'

const REMEDY = 'Add a `test` script and a spec, or add the package to EXEMPT with the reason tests are the wrong tool for it.'

// Every repository check ends in this call, and over a healthy tree it is only
// ever called with nothing to report. A helper that stopped throwing left all
// of them green with a real problem in the tree (#738).
describe('assertNoProblems', () => {
  it('passes a result with no problems, whatever its notes say', () => {
    const result = { problems: [], remedy: REMEDY, notes: ['measured 26 packages'] }

    expect(() => assertNoProblems(result)).not.toThrow()
  })

  it('names every problem and the remedy when the result has problems', () => {
    const result = { problems: ['@poveste/app has no test script', '@poveste/vendors has no test script'], remedy: REMEDY, notes: [] }

    expect(() => assertNoProblems(result)).toThrow([
      'found 2 problems:',
      '  • @poveste/app has no test script',
      '  • @poveste/vendors has no test script',
      '',
      REMEDY,
    ].join('\n'))
  })

  it('counts a single problem in the singular', () => {
    const result = { problems: ['@poveste/app has no test script'], remedy: REMEDY, notes: [] }

    expect(() => assertNoProblems(result)).toThrow(/^found 1 problem:$/m)
  })

  // vitest cuts the reported stack after the last `__VITEST_HELPER__` frame, so
  // a failing check points at the test that called it rather than in here.
  it('throws from inside a vitest helper, so a failure is reported at the caller', () => {
    const result = { problems: ['@poveste/app has no test script'], remedy: REMEDY, notes: [] }

    expect(() => assertNoProblems(result)).toThrow(expect.objectContaining({ stack: expect.stringContaining('__VITEST_HELPER__') }))
  })
})
