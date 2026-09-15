import process from 'node:process'
import { it } from 'vitest'
import { reportLocalTags } from '../check-local-tags.ts'

// Reports and never fails (#457), so there is nothing to assert.
it('reports local tags a release would not push', () => {
  process.stdout.write(`${reportLocalTags()}\n`)
})
