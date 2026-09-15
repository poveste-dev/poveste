import { expect, it } from 'vitest'
import { checkNodeVersions } from '../check-node-versions.ts'

it('every CI job reads .node-version, except the recorded floor', { tags: ['versions', 'ci'] }, () => {
  expect(checkNodeVersions(), '`.node-version` is what the release publishes from. A job that pins the number instead keeps building on it after the file moves, and stays green while doing it (#425).').toEqual([])
})
