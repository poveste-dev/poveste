import process from 'node:process'
import { expect, it } from 'vitest'
import { checkDocsSiteLive, SITE } from '../check-docs-site.ts'

// Production by default; a deploy preview is named by `POVESTE_DOCS_SITE`.
it('the deployed docs site answers correctly', { tags: ['docs', 'network'] }, async () => {
  const site = process.env.POVESTE_DOCS_SITE ?? SITE
  const { problems, deployed } = await checkDocsSiteLive(site)
  process.stdout.write(`Reached ${site} (${deployed ?? 'deploy unidentified'})\n`)
  expect(problems).toEqual([])
})
