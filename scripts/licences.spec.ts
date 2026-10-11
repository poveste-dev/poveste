import { describe, expect, it } from 'vitest'
import { ALLOWED_LICENCES, BUNDLED_ASSET_ALLOWED, BUNDLED_LICENCES, declaredLicence, DEPENDENCY_LICENCES, licenceProblem } from './licences.ts'

describe('declaredLicence', () => {
  it('reads the SPDX string a manifest declares', () => {
    expect(declaredLicence({ license: 'MIT' })).toBe('MIT')
  })

  it('reads the legacy object and array forms', () => {
    expect(declaredLicence({ license: { type: 'ISC' } })).toBe('ISC')
    expect(declaredLicence({ licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] })).toBe('MIT OR Apache-2.0')
  })

  it('is undefined when a manifest declares none', () => {
    expect(declaredLicence({})).toBeUndefined()
  })
})

describe('licenceProblem', () => {
  it('allows a licence in the list', () => {
    expect(licenceProblem('MIT', ALLOWED_LICENCES)).toBeUndefined()
  })

  it('refuses one outside it', () => {
    expect(licenceProblem('GPL-3.0-only', ALLOWED_LICENCES)).toBe('is licensed GPL-3.0-only, which is not in the allow-list')
  })

  it('allows an OR when either side is allowed', () => {
    expect(licenceProblem('(GPL-3.0-only OR MIT)', ALLOWED_LICENCES)).toBeUndefined()
  })

  it('refuses an AND when either side is not', () => {
    expect(licenceProblem('MIT AND GPL-3.0-only', ALLOWED_LICENCES)).toBe('is licensed MIT AND GPL-3.0-only, which is not in the allow-list')
  })

  it('refuses a missing licence and one that does not parse, rather than guessing', () => {
    expect(licenceProblem(undefined, ALLOWED_LICENCES)).toBe('declares no licence')
    expect(licenceProblem('MIT OR', ALLOWED_LICENCES)).toBe('declares a licence that does not parse: MIT OR')
    expect(licenceProblem('GPL-2.0 WITH Classpath-exception-2.0', ALLOWED_LICENCES)).toBe('declares a licence that does not parse: GPL-2.0 WITH Classpath-exception-2.0')
  })
})

describe('the lists, by how the code ships', () => {
  it('lets a package depend on MPL-2.0 code and refuses it in a bundle', () => {
    expect(licenceProblem('MPL-2.0', DEPENDENCY_LICENCES)).toBeUndefined()
    expect(licenceProblem('MPL-2.0', BUNDLED_LICENCES, 'the allow-list for bundled code')).toBe('is licensed MPL-2.0, which is not in the allow-list for bundled code')
  })

  it('allows OFL-1.1 for a bundled asset and nothing else', () => {
    expect(licenceProblem('OFL-1.1', BUNDLED_ASSET_ALLOWED)).toBeUndefined()
    expect(licenceProblem('OFL-1.1', BUNDLED_LICENCES)).toBeDefined()
    expect(licenceProblem('OFL-1.1', DEPENDENCY_LICENCES)).toBeDefined()
  })
})
