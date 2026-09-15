import { expect, it } from 'vitest'
import { checkStarters } from '../check-starters.ts'

it('every starter installs', { tags: ['release', 'network'] }, async () => {
  expect(await checkStarters(), 'Fix the versions in docs/.vitepress/theme/starters.ts.').toEqual([])
})
