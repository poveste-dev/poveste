import { expect, it } from 'vitest'
import { checkDocsSite } from '../check-docs-site.ts'

it('the docs site config and build hold up', async () => {
  expect(await checkDocsSite(), 'Run `pnpm run docs:build` first if the build is missing.').toEqual([])
})
