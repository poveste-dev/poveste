import { describe, expect, it } from 'vitest'
import { onlySections, rootFirst, tagHref, tagText, toEntries } from '../app/util/component-docs'

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

describe('a story that names the sections of its table', () => {
  const prop = { name: 'label', type: 'string', required: true, tags: [] }
  const slot = { name: 'default', tags: [] }
  const event = { name: 'click', tags: [] }
  const button = { file: 'src/Button.vue', name: 'Button', doc: { props: [prop], slots: [slot], events: [event] } }

  it('shows the whole table when it names none', () => {
    expect(onlySections([button], undefined)).toEqual([button])
    expect(onlySections([button], true)).toEqual([button])
  })

  it('shows only the sections it names', () => {
    expect(onlySections([button], ['events', 'props'])).toEqual([{ ...button, doc: { props: [prop], slots: [], events: [event] } }])
  })

  it('drops a component with nothing in those sections, and keeps one that failed', () => {
    const slotsOnly = { file: 'src/Layout.vue', name: 'Layout', doc: { props: [], slots: [slot], events: [] } }
    const broken = { file: 'src/Broken.vue', name: 'Broken', error: 'no props type' }

    expect(onlySections([slotsOnly, broken], ['props'])).toEqual([broken])
  })
})

describe('a compound story\'s components', () => {
  const entry = (name: string) => ({ file: `src/${name}.vue`, name })

  it('puts the root first and keeps the parts in their order', () => {
    expect(rootFirst([entry('SelectTrigger'), entry('SelectRoot'), entry('SelectContent')]).map(e => e.name)).toEqual(['SelectRoot', 'SelectTrigger', 'SelectContent'])
  })

  // reka-ui's CalendarSelect imports SelectRoot before CalendarRoot (#1432).
  it('opens the root of the family the story\'s folder is named for', () => {
    const entries = [entry('SelectRoot'), entry('SelectTrigger'), entry('CalendarRoot')]

    expect(rootFirst(entries, 'packages/core/src/Calendar/story/CalendarSelect.story.vue')[0]!.name).toBe('CalendarRoot')
  })

  it('opens the root the story\'s file is named for when no folder is', () => {
    const entries = [entry('DialogRoot'), entry('SelectRoot')]

    expect(rootFirst(entries, 'src/stories/SelectWithinDialog.story.vue')[0]!.name).toBe('SelectRoot')
  })

  it('keeps the order when no component is a root', () => {
    expect(rootFirst([entry('Card'), entry('Button')]).map(e => e.name)).toEqual(['Card', 'Button'])
  })
})
