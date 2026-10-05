import { describe, expect, it } from 'vitest'
import { declaredLicence, licenceProblem } from './licences.ts'

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
    expect(licenceProblem('MIT')).toBeUndefined()
  })

  it('refuses one outside it', () => {
    expect(licenceProblem('GPL-3.0-only')).toBe('is licensed GPL-3.0-only, which is not in the allow-list')
  })

  it('allows an OR when either side is allowed', () => {
    expect(licenceProblem('(GPL-3.0-only OR MIT)')).toBeUndefined()
  })

  it('refuses an AND when either side is not', () => {
    expect(licenceProblem('MIT AND GPL-3.0-only')).toBe('is licensed MIT AND GPL-3.0-only, which is not in the allow-list')
  })

  it('refuses a missing licence and one that does not parse, rather than guessing', () => {
    expect(licenceProblem(undefined)).toBe('declares no licence')
    expect(licenceProblem('MIT OR')).toBe('declares a licence that does not parse: MIT OR')
    expect(licenceProblem('GPL-2.0 WITH Classpath-exception-2.0')).toBe('declares a licence that does not parse: GPL-2.0 WITH Classpath-exception-2.0')
  })
})
