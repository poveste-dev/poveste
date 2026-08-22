import { describe, expect, it } from 'vitest'
import { getDefaultConfig, mergeConfig } from '../config.js'

// `mergeConfig(user, defaults)`: defu-style, the first argument wins.
describe('mergeConfig', () => {
  it('adds user storyIgnored patterns to the defaults instead of replacing them', () => {
    const merged = mergeConfig({ storyIgnored: ['**/fixtures/**'] }, getDefaultConfig())

    expect(merged.storyIgnored).toEqual(expect.arrayContaining(['**/node_modules/**', '**/dist/**', '**/fixtures/**']))
  })

  it('does not duplicate a default a user spelled out again', () => {
    const merged = mergeConfig({ storyIgnored: ['**/node_modules/**', '**/fixtures/**'] }, getDefaultConfig())

    expect(merged.storyIgnored.filter(p => p === '**/node_modules/**')).toHaveLength(1)
  })

  // Narrowing the match is a real use — `src/**/*.story.vue` to skip binary
  // folders — so the replace rule is the right one there.
  it('still lets a user narrow storyMatch', () => {
    const merged = mergeConfig({ storyMatch: ['src/**/*.story.vue'] }, getDefaultConfig())

    expect(merged.storyMatch).toEqual(['src/**/*.story.vue'])
  })
})
