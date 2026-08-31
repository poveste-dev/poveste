import { describe, expect, it } from 'vitest'
import { screenshotFileName } from './index.js'

describe('screenshotFileName', () => {
  // `Variant` uses `${story.id}-${story.variants.length}` when a variant
  // declares no id, which is what produced the doubled name in #353.
  it('does not repeat the story id an auto-generated variant already carries', () => {
    expect(screenshotFileName('src-components-injectdemo-story-vue', 'src-components-injectdemo-story-vue-0', 1280, 800))
      .toBe('src-components-injectdemo-story-vue-0-1280x800.png')
  })

  it('keeps the story id for a named variant, which is only unique within its story', () => {
    expect(screenshotFileName('conformance-button', 'default', 1280, 800))
      .toBe('conformance-button-default-1280x800.png')
  })

  // Two stories with a `default` variant would otherwise collide on one file.
  it('gives two stories sharing a variant name different files', () => {
    const a = screenshotFileName('conformance-button', 'default', 1280, 800)
    const b = screenshotFileName('conformance-docs', 'default', 1280, 800)

    expect(a).not.toBe(b)
  })

  it('only strips the prefix when the separator is there too', () => {
    expect(screenshotFileName('button', 'buttonish', 800, 600))
      .toBe('button-buttonish-800x600.png')
  })

  it('names the preset it captured', () => {
    expect(screenshotFileName('story', 'story-0', 375, 812))
      .toBe('story-0-375x812.png')
  })
})
