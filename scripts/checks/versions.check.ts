/**
 * @module-tag versions
 */
import { expect, it } from 'vitest'
import { checkVersions } from '../check-versions.ts'

it('the version tables match what the packages declare', async () => {
  expect(await checkVersions(), 'The declared range is the truth. Fix the table, or fix the range and the CI job behind it.').toEqual([])
})
