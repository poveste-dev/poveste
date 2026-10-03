import { describe, expect, it } from 'vitest'
import { tagHref, tagText, toEntries } from '../app/util/component-docs'

describe('the docs a story\'s components answer with', () => {
  it('names each component after its file', () => {
    const entries = toEntries({
      storyId: 'button',
      components: {
        'src/components/BaseButton.vue': { doc: { props: [], slots: [], events: [] } },
        'src/Broken.vue': { error: 'no props type' },
      },
    })

    expect(entries).toEqual([
      { file: 'src/components/BaseButton.vue', name: 'BaseButton', doc: { props: [], slots: [], events: [] } },
      { file: 'src/Broken.vue', name: 'Broken', error: 'no props type' },
    ])
  })
})

describe('reading tags', () => {
  it('tells a bare tag from an absent one', () => {
    expect(tagText([{ name: 'deprecated' }], 'deprecated')).toBe('')
    expect(tagText([], 'deprecated')).toBeUndefined()
  })

  it('links a @see only when it carries a URL', () => {
    expect(tagHref('the guide https://poveste.dev/guide')).toBe('https://poveste.dev/guide')
    expect(tagHref('BaseButton')).toBeUndefined()
  })
})
