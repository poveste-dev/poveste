import { describe, expect, it } from 'vitest'
import { declaredOnlyInPackages, normalizeDefault } from '../docgen/typed.js'

describe('normalizeDefault', () => {
  it('reads quoting from a tag and from the printer as the same value', () => {
    expect(normalizeDefault('\'md\'')).toBe(normalizeDefault('"md"'))
    expect(normalizeDefault('`3`')).toBe('3')
  })
})

describe('declaredOnlyInPackages', () => {
  it('holds for a prop every declaration of which is installed, and no allowed package declares', () => {
    expect(declaredOnlyInPackages(['/book/node_modules/solid-js/types/jsx.d.ts'], [])).toBe(true)
    expect(declaredOnlyInPackages(['/book/node_modules/.pnpm/reka-ui@2/node_modules/reka-ui/dist/a.d.ts'], ['reka-ui'])).toBe(false)
  })

  it('fails for a prop the book declares, even once, and on Windows paths', () => {
    expect(declaredOnlyInPackages(['/book/node_modules/x/a.d.ts', '/book/src/types.ts'], [])).toBe(false)
    expect(declaredOnlyInPackages(['C:\\book\\node_modules\\x\\a.d.ts'], [])).toBe(true)
  })
})
