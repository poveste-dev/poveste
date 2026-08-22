import type { Stats } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createWatchIgnore } from '../util/watch-ignore.js'

const file = { isFile: () => true } as Stats
const dir = { isFile: () => false } as Stats

describe('createWatchIgnore', () => {
  const root = '/repo/.claude/worktrees/feature/examples/vue3'
  const ignored = createWatchIgnore(['**/node_modules/**', '**/dist/**'], ['**/*.story.md'])

  it('ignores storyIgnored paths when the root sits under a dot directory', () => {
    expect(ignored(`${root}/node_modules/foo/index.js`, file)).toBe(true)
    expect(ignored(`${root}/node_modules/.pnpm/foo/node_modules/bar`, dir)).toBe(true)
    expect(ignored(`${root}/dist/index.html`, file)).toBe(true)
  })

  it('keeps included files when the root sits under a dot directory', () => {
    expect(ignored(`${root}/src/Button.story.md`, file)).toBe(false)
  })

  it('traverses directories and skips other files', () => {
    expect(ignored(`${root}/src`, dir)).toBe(false)
    expect(ignored(`${root}/src/Button.vue`, file)).toBe(true)
    expect(ignored(`${root}/src/Button.vue`)).toBe(false)
  })

  it('matches patterns resolved to absolute paths', () => {
    const resolved = createWatchIgnore([`${root}/**/node_modules/**`], [`${root}/**/*.story.vue`])
    expect(resolved(`${root}/node_modules/.pnpm/foo/node_modules/bar/index.js`, file)).toBe(true)
    expect(resolved(`${root}/src/Button.story.vue`, file)).toBe(false)
  })
})
