import { expect, it } from 'vitest'
import { checkReadmes } from '../check-readmes.ts'

it('every page describes Poveste and points somewhere real', { tags: ['docs'] }, async () => {
  expect(await checkReadmes(), 'Pages that describe the wrong project, or point nowhere.').toEqual([])
})
