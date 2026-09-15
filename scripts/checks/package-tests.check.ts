/**
 * @module-tag release
 */
import { expect, it } from 'vitest'
import { checkPackageTests } from '../check-package-tests.ts'

it('every published package declares a test script', () => {
  expect(checkPackageTests(), 'Add a `test` script and a spec, or add the package to EXEMPT in scripts/check-package-tests.ts with the reason tests are the wrong tool for it.').toEqual([])
})
