/**
 * @module-tag docs
 * @module-tag examples
 */
import { expect, it } from 'vitest'
import { checkRecipes } from '../check-recipes.ts'

it('every published recipe is exactly what its example runs', () => {
  expect(checkRecipes(), 'Copy the block from the docs into the example, or fix the docs. They are one thing.').toEqual([])
})
