import type { CheckResult } from './check-result.ts'
import { vi } from 'vitest'

// A helper, so a failure points at the test that called it rather than in here.
export const assertNoProblems = vi.defineHelper((result: CheckResult) => {
  if (result.problems.length > 0) {
    const count = `${result.problems.length} problem${result.problems.length === 1 ? '' : 's'}`
    throw new Error([`found ${count}:`, ...result.problems.map(problem => `  • ${problem}`), '', result.remedy].join('\n'))
  }
})
