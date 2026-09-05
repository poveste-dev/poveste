import { describe, expect, it } from 'vitest'
import { viteMode } from '../vite.js'

describe('viteMode', () => {
  it('translates a build into the mode Vite names a build', () => {
    expect(viteMode('build')).toBe('production')
  })

  it('translates dev into the mode Vite names a dev server', () => {
    expect(viteMode('dev')).toBe('development')
  })

  // The defect: `'build'` reached Vite unchanged, and a user config written the
  // standard way tested for `'production'` — so it took neither branch, in both
  // poveste commands (#349).
  it('never returns poveste\'s own vocabulary, which is what a user config cannot test for', () => {
    expect(['build', 'dev']).not.toContain(viteMode('build'))
    expect(['build', 'dev']).not.toContain(viteMode('dev'))
  })

  // `.env.development` was loaded for a published book because Vite selects the
  // file from `mode`, not from NODE_ENV.
  it('picks the env file a built book should read', () => {
    expect(`.env.${viteMode('build')}`).toBe('.env.production')
  })
})
