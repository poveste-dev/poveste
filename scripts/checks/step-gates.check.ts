import { expect, it } from 'vitest'
import { checkStepGates } from '../check-step-gates.ts'

it('every workflow step\'s position means what it looks like', { tags: ['ci'] }, () => {
  expect(checkStepGates(), 'Name the dependency in the `if:`, or record the boundary in scripts/check-step-gates.ts with the reason (#723).').toEqual([])
})
