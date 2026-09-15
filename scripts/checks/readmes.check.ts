/**
 * @module-tag docs
 */
import { expect, it } from 'vitest'
import { checkReadmes } from '../check-readmes.ts'

it('every page describes Poveste and points somewhere real', async () => {
  expect(await checkReadmes(), 'Pages that describe the wrong project, or point nowhere.').toEqual([])
})
