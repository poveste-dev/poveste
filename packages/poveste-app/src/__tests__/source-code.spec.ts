import type { Story, Variant } from '../app/types'
import { describe, expect, it, vi } from 'vitest'
import { getSourceCode } from '../app/util/docs'

const plugin = vi.hoisted(() => ({ generateSourceCode: (() => undefined) as (variant: unknown) => unknown, loads: 0 }))

vi.mock('virtual:$poveste-support-plugins-client', () => ({
  clientSupportPlugins: {
    framework: async () => {
      plugin.loads++
      return { generateSourceCode: (variant: unknown) => plugin.generateSourceCode(variant) }
    },
  },
}))

const FILE = '<Story title="Grid" />'

function storyWithFile() {
  return { file: { supportPluginId: 'framework', source: async () => ({ default: FILE }) } } as unknown as Story
}

describe('getSourceCode with a framework plugin', () => {
  it('returns the story file when the plugin returns nothing synchronously, as plugin-svelte does', async () => {
    plugin.generateSourceCode = () => undefined

    const source = await getSourceCode(storyWithFile(), {} as Variant)

    expect(source).toBe(FILE)
  })

  it('returns the story file when the plugin resolves to an empty string', async () => {
    plugin.generateSourceCode = async () => ''

    const source = await getSourceCode(storyWithFile(), {} as Variant)

    expect(source).toBe(FILE)
  })

  it('prefers what the plugin generates', async () => {
    plugin.generateSourceCode = async () => '<Button />'

    const source = await getSourceCode(storyWithFile(), {} as Variant)

    expect(source).toBe('<Button />')
  })

  it('returns a variant\'s declared source without loading the plugin', async () => {
    plugin.loads = 0

    const source = await getSourceCode(storyWithFile(), { source: '<Declared />' } as Variant)

    expect(source).toBe('<Declared />')
    expect(plugin.loads).toBe(0)
  })

  it('calls a declared source that is a function of the variant\'s state, as a Svelte story can declare it', async () => {
    const variant = { state: { disabled: true }, source: (state: { disabled: boolean }) => `<Button${state.disabled ? ' disabled' : ''} />` } as unknown as Variant

    const source = await getSourceCode(storyWithFile(), variant)

    expect(source).toBe('<Button disabled />')
  })
})
