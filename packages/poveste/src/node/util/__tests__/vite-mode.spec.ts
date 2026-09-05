import { describe, expect, it } from 'vitest'
import { viteCommand, viteMode } from '../vite-mode.js'

describe('viteMode', () => {
  it('translates a build into the mode Vite names a build', () => {
    expect(viteMode('build')).toBe('production')
  })

  it('translates dev into the mode Vite names a dev server', () => {
    expect(viteMode('dev')).toBe('development')
  })

  // The defect: `'build'` reached Vite unchanged, so a user config testing for
  // `'production'` took neither branch (#349).
  it('never returns poveste\'s own vocabulary, which is what a user config cannot test for', () => {
    expect(['build', 'dev']).not.toContain(viteMode('build'))
    expect(['build', 'dev']).not.toContain(viteMode('dev'))
  })

  it('picks the env file a built book should read', () => {
    expect(`.env.${viteMode('build')}`).toBe('.env.production')
  })
})

describe('viteCommand', () => {
  it('names a build the way Vite names one', () => {
    expect(viteCommand('build')).toBe('build')
  })

  it('names dev `serve`, which is Vite\'s word and not poveste\'s', () => {
    expect(viteCommand('dev')).toBe('serve')
  })
})
