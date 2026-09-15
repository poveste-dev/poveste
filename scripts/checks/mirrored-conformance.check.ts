/**
 * @module-tag examples
 */
import { expect, it } from 'vitest'
import { checkMirroredConformance } from '../check-mirrored-conformance.ts'

it('every mirrored conformance story is identical to its source', () => {
  expect(checkMirroredConformance(), 'Run `pnpm run sync:conformance` to rewrite the mirrors from their source, or add the file to MIRROR_EXCEPTIONS in scripts/check-mirrored-conformance.ts if it should differ.').toEqual([])
})
