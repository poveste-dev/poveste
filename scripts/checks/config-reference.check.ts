/**
 * @module-tag docs
 */
import { expect, it } from 'vitest'
import { checkConfigReference } from '../check-config-reference.ts'

it('every config key has a reference entry, and every entry is a config key', () => {
  expect(checkConfigReference(), 'Every key needs a heading in docs/reference/config.md. A key books should not set still needs one, saying so — an omission reads as an oversight rather than a decision.').toEqual([])
})
