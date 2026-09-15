import { expect, it } from 'vitest'
import { checkTaskGraph } from '../check-task-graph.ts'

it('the task graph matches release:check', { tags: ['ci'] }, () => {
  expect(checkTaskGraph(), 'The `&&` chain in release:check decides; release:report only reports. A report covering less than the gate is the failure worth catching (#716).').toEqual([])
})
