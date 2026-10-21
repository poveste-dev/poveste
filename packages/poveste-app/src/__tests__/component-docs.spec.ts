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

  it('names a component the extractor named, whatever file it was read from', () => {
    const doc = { name: 'Button', props: [], slots: [], events: [] }

    const entries = toEntries({ storyId: 'button', components: { 'src/Button.story.tsx': { doc } } })

    expect(entries).toEqual([{ file: 'src/Button.story.tsx', name: 'Button', doc }])
  })

  it('names a component the extractor named in its failure, not the story file it was read from', () => {
    const entries = toEntries({ storyId: 'alert', components: { 'src/Banner.story.tsx': { error: 'no props type', name: 'Alert' } } })

    expect(entries).toEqual([{ file: 'src/Banner.story.tsx', name: 'Alert', error: 'no props type' }])
  })

  it('names an unnamed component after its story file, without `.story`', () => {
    const entries = toEntries({ storyId: 'alert', components: { 'src/Alert.story.tsx': { error: 'TypeScript did not read the story file' } } })

    expect(entries).toEqual([{ file: 'src/Alert.story.tsx', name: 'Alert', error: 'TypeScript did not read the story file' }])
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
