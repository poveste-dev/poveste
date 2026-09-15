import process from 'node:process'
import { it } from 'vitest'
import { reportLocalTags } from '../check-local-tags.ts'

// Reports and never fails (#457), so there is nothing to assert. The annotation
// is what reaches the workflow run; the default reporter hides it on a pass.
it('reports local tags a release would not push', { tags: ['release'] }, async ({ annotate }) => {
  const report = reportLocalTags()
  process.stdout.write(`${report}\n`)
  await annotate(report, report.startsWith('⚠️') ? 'warning' : 'notice')
})
