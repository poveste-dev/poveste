import type { Resolve } from '../docgen/reexports.js'
import { existsSync, statSync } from 'node:fs'
import { dirname, join, resolve as resolvePath } from 'pathe'
import { describe, expect, it } from 'vitest'
import { followName, storyComponents } from '../docgen/reexports.js'

const root = join(import.meta.dirname, 'docgen-reexports')
const file = (path: string) => join(root, path)

// Node's relative resolution with the extensions a Vite book leaves off; a bare import is a package.
const resolve: Resolve = async (specifier, importer) => {
  if (!specifier.startsWith('.')) {
    return `/book/node_modules/${specifier}/index.js`
  }
  const base = resolvePath(dirname(importer), specifier)
  return [base, `${base}.ts`, join(base, 'index.ts')].find(candidate => existsSync(candidate) && statSync(candidate).isFile())
}

describe('a story\'s components, through re-exports', () => {
  it('follows a barrel two levels deep to each component the story imports', async () => {
    const { files } = await storyComponents(file('stories/Barrel.story.vue'), resolve)

    expect(files.sort()).toEqual([file('components/Card.vue'), file('components/Select/SelectRoot.vue'), file('components/Select/SelectTrigger.vue')])
  })

  it('follows an import the barrel re-exports by name', async () => {
    expect(await followName(file('components/index.ts'), 'Card', resolve)).toBe(file('components/Card.vue'))
  })

  // reka-ui's `Presence` is a `defineComponent` in a `.ts` file, reached through its barrel (#1463).
  it('reaches a script file\'s own default export, as a component written with defineComponent is', async () => {
    expect(await followName(file('components/Presence/index.ts'), 'Presence', resolve)).toBe(file('components/Presence/Presence.ts'))
    expect(await followName(file('components/Presence/index.ts'), 'Toggle', resolve)).toBe(file('components/Presence/Toggle.ts'))
  })

  it('reaches no component for a value that is not one, nor for a type', async () => {
    expect(await followName(file('components/index.ts'), 'SELECT_VERSION', resolve)).toBeUndefined()
    expect(await followName(file('components/index.ts'), 'CardProps', resolve)).toBeUndefined()
  })

  it('leaves out what the story imports from a package', async () => {
    const { files, unresolved } = await storyComponents(file('stories/Barrel.story.vue'), resolve)

    expect(files.some(found => found.includes('/node_modules/'))).toBe(false)
    expect(unresolved).toBe(0)
  })
})

describe('a story that names its components', () => {
  it('documents exactly the components a Vue story\'s `component` lists, not the helper it renders', async () => {
    const { files, named } = await storyComponents(file('stories/Named.story.vue'), resolve)

    expect(named).toBe(true)
    expect(files.sort()).toEqual([file('components/Select/SelectRoot.vue'), file('components/Select/SelectTrigger.vue')])
  })

  it('reads a member of a namespace import', async () => {
    expect((await storyComponents(file('stories/Namespace.story.vue'), resolve)).files).toEqual([file('components/Select/SelectRoot.vue')])
  })

  it('reads a Svelte story\'s `component`', async () => {
    expect((await storyComponents(file('stories/Svelte.story.svelte'), resolve)).files).toEqual([file('components/Card.vue')])
  })
})

describe('a story whose components cannot be traced', () => {
  it('counts the capitalised imports that reached no component, and not a lowercase helper', async () => {
    const { files, unresolved } = await storyComponents(file('stories/Untraced.story.vue'), resolve)

    expect(files).toEqual([])
    expect(unresolved).toBe(1)
  })
})

// bits-ui and flowbite-svelte ship their components behind a JavaScript entry (#1538).
describe('a story that documents a library\'s component', () => {
  it('counts a named member of a package\'s export as packaged, not unresolved', async () => {
    const { files, unresolved, packaged } = await storyComponents(file('stories/Library.story.svelte'), resolve)

    expect({ files, unresolved, packaged }).toEqual({ files: [], unresolved: 0, packaged: 1 })
  })

  it('counts a capitalised import from a package as packaged, and not a lowercase one', async () => {
    const { files, unresolved, packaged } = await storyComponents(file('stories/LibraryImported.story.vue'), resolve)

    expect({ files, unresolved, packaged }).toEqual({ files: [], unresolved: 0, packaged: 1 })
  })
})
