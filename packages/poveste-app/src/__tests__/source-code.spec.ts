import type { Story, Variant } from '../app/types'
import { describe, expect, it, vi } from 'vitest'
import { getSourceCode } from '../app/util/docs'

const generated = vi.hoisted(() => ({ value: undefined as string | undefined }))

vi.mock('virtual:$poveste-support-plugins-client', () => ({
  clientSupportPlugins: {
    framework: async () => ({ generateSourceCode: async () => generated.value }),
  },
}))

function storyWithFile(text: string) {
  return { file: { supportPluginId: 'framework', source: async () => ({ default: text }) } } as unknown as Story
}

describe('getSourceCode with a framework plugin', () => {
  it('returns the story file when the plugin generates nothing', async () => {
    generated.value = undefined

    const source = await getSourceCode(storyWithFile('<Story title="Grid" />'), {} as Variant)

    expect(source).toBe('<Story title="Grid" />')
  })

  it('prefers what the plugin generates', async () => {
    generated.value = '<Button />'

    const source = await getSourceCode(storyWithFile('<Story title="Grid" />'), {} as Variant)

    expect(source).toBe('<Button />')
  })
})
