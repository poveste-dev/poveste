/**
 * @module-tag release
 * @module-tag network
 */
import { expect, it } from 'vitest'
import { checkStarters } from '../check-starters.ts'

it('every starter installs the version that just published', async () => {
  expect(await checkStarters(undefined, { afterPublish: true }), 'The release that just published cannot be installed. Cut a patch release with the fix, then `npm deprecate` the broken versions. Do not unpublish.').toEqual([])
})
