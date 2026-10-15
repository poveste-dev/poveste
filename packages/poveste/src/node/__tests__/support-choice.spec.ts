import { describe, expect, it } from 'vitest'
import { chooseSupportPlugin } from '../stories.js'

const JSX = ['**/*.story.tsx', '**/*.story.jsx']
// In the order `plugins: [HstSolid(), HstReact()]` gives them.
const SOLID_FIRST = [
  { id: 'solid', patterns: JSX, pluginIds: ['solid'] },
  { id: 'react', patterns: JSX, pluginIds: ['react'] },
]
const PLUGINS = [
  { id: 'solid', moduleName: '@poveste/plugin-solid' },
  { id: 'react', moduleName: '@poveste/plugin-react' },
]
const FILE = '/book/src/Button.story.tsx'

function choose(source: string | undefined, match = SOLID_FIRST) {
  return chooseSupportPlugin(FILE, () => source, match, PLUGINS)
}

// The first plugin in `plugins` rendered every `.story.tsx`, so a React story
// in a book that also had Solid rendered nothing (#1273).
describe('a story file two plugins claim', () => {
  it('goes to the plugin it imports, whichever comes first', () => {
    expect(choose(`import { defineStory } from '@poveste/plugin-react'`)).toEqual({ pluginId: 'react' })
    expect(choose(`import { defineStory } from "@poveste/plugin-solid"`)).toEqual({ pluginId: 'solid' })
  })

  it('counts an import from a subpath of the plugin', () => {
    expect(choose(`import type { StoryOptions } from '@poveste/plugin-react/client'`)).toEqual({ pluginId: 'react' })
  })

  it('goes to the first plugin, with a warning, when it imports both', () => {
    const choice = choose(`import { defineStory } from '@poveste/plugin-react'\nimport { HstSolid } from '@poveste/plugin-solid'`)

    expect(choice.pluginId).toBe('solid')
    expect(choice.warning).toMatch(/imports both `@poveste\/plugin-solid` and `@poveste\/plugin-react`, so it is rendered by the first in `plugins`, `@poveste\/plugin-solid`/)
  })

  // A helper re-exporting `defineStory` hides the plugin from the story file.
  it('goes to the first plugin, with a warning that says how to choose, when it imports neither', () => {
    const choice = choose(`import { defineStory } from './story-helpers'`)

    expect(choice.pluginId).toBe('solid')
    expect(choice.warning).toMatch(/is claimed by `@poveste\/plugin-solid` and `@poveste\/plugin-react` and imports neither.*To choose, import `defineStory` from one of them in the story file/)
  })

  it('goes to the first plugin, with a warning, when the file cannot be read', () => {
    expect(choose(undefined)).toMatchObject({ pluginId: 'solid', warning: expect.stringContaining('imports neither') })
  })
})

describe('a story file one plugin claims', () => {
  it('goes to that plugin without reading the file', () => {
    let read = false
    const choice = chooseSupportPlugin('/book/src/Button.story.vue', () => {
      read = true
      return ''
    }, [{ id: 'vue', patterns: ['**/*.vue'], pluginIds: ['vue3'] }, ...SOLID_FIRST], PLUGINS)

    expect(choice).toEqual({ pluginId: 'vue3' })
    expect(read).toBe(false)
  })

  it('goes to no plugin when none claims it', () => {
    expect(chooseSupportPlugin('/book/src/Button.story.ts', () => '', SOLID_FIRST, PLUGINS)).toEqual({ pluginId: undefined })
  })
})
