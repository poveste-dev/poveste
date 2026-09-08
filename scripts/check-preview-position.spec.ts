import { describe, expect, it } from 'vitest'
import { canonical, groupsIn, isStable, operandsOf, previewReaching, problemsIn, STABLE } from './check-preview-position.ts'

const wrap = (template: string) => `<template>${template}</template>`

// The regression: a live layout flag with the preview in more than one branch.
// This is #596 (settings toggles) and #600 (isMobile) in miniature.
describe('a group switched on a live layout flag', () => {
  it('fails when more than one branch renders the preview', () => {
    const files = [{
      file: 'App.vue',
      source: wrap('<div v-if="isMobile"><RouterView /></div><div v-else><RouterView /></div>'),
    }]

    expect(problemsIn(files)).toEqual([
      'App.vue: 2 branches of one group render the preview, switched on `isMobile`',
    ])
  })

  it('passes when only one branch renders the preview', () => {
    const files = [{
      file: 'App.vue',
      source: wrap('<div v-if="isMobile"><RouterView /></div><aside v-else>nothing</aside>'),
    }]

    expect(problemsIn(files)).toEqual([])
  })

  // The property that makes the skip-list safe: a condition nobody has
  // classified fails, rather than being assumed harmless.
  it('fails on a condition nobody has classified', () => {
    const files = [{
      file: 'App.vue',
      source: wrap('<div v-if="isCompactChrome"><RouterView /></div><div v-else><RouterView /></div>'),
    }]

    expect(problemsIn(files)).toHaveLength(1)
  })
})

// The two groups on `next` that look like the regression and are not: their
// conditions are properties of the story, so they cannot flip while the story
// is stationary, and a story change rebuilds the preview anyway.
describe('a group switched on the story being shown', () => {
  it('passes with the preview in both branches', () => {
    const files = [{
      file: 'StoryViewer.vue',
      source: wrap(
        '<StoryVariantGrid v-if="storyStore.currentStory.layout.type === \'grid\'"><RouterView /></StoryVariantGrid>'
        + '<StoryVariantSingle v-else><RouterView /></StoryVariantSingle>',
      ),
    }]

    expect(problemsIn(files)).toEqual([])
  })

  it('treats a bare v-else as stable, since it inherits its siblings', () => {
    expect(isStable(null)).toBe(true)
  })

  it('rejects a group where only some conditions are stable', () => {
    const files = [{
      file: 'Mixed.vue',
      source: wrap(
        '<div v-if="currentStory.docsOnly"><RouterView /></div>'
        + '<div v-else-if="isMobile"><RouterView /></div>'
        + '<div v-else><RouterView /></div>',
      ),
    }]

    expect(problemsIn(files)).toHaveLength(1)
  })
})

describe('reaching the preview', () => {
  it('follows a component that contains one that contains it', () => {
    const files = [
      { file: 'Outer.vue', source: wrap('<Middle />') },
      { file: 'Middle.vue', source: wrap('<StoryVariantSinglePreviewRemote />') },
    ]

    const reaching = previewReaching(files)
    expect(reaching.has(canonical('Middle'))).toBe(true)
    expect(reaching.has(canonical('Outer'))).toBe(true)
  })

  it('does not follow a component that never reaches it', () => {
    const files = [{ file: 'Sidebar.vue', source: wrap('<nav><a /></nav>') }]

    expect(previewReaching(files).has(canonical('Sidebar'))).toBe(false)
  })

  // #595 lived below the router: the file carrying the branches has no
  // `<RouterView>` at all, which is why counting mount points missed it.
  it('flags a branch group that carries the preview without a RouterView', () => {
    const files = [
      { file: 'StoryView.vue', source: wrap(
        '<template v-if="isMobile"><StoryViewer /></template>'
        + '<template v-else><StoryViewer /></template>',
      ) },
      { file: 'StoryViewer.vue', source: wrap('<StoryVariantSinglePreviewNative />') },
    ]

    expect(problemsIn(files)).toHaveLength(1)
  })
})

describe('groupsIn', () => {
  it('reads a run of v-if / v-else-if / v-else as one group', () => {
    const groups = groupsIn(wrap('<a v-if="x" /><b v-else-if="y" /><c v-else />'))

    expect(groups).toHaveLength(1)
    expect(groups[0].branches.map(b => b.tag)).toEqual(['a', 'b', 'c'])
  })

  it('does not join two groups separated by an unconditional sibling', () => {
    const groups = groupsIn(wrap('<a v-if="x" /><hr /><b v-if="y" />'))

    expect(groups).toHaveLength(2)
  })

  it('finds a group nested inside another element', () => {
    expect(groupsIn(wrap('<main><a v-if="x" /><b v-else /></main>'))).toHaveLength(1)
  })
})

describe('the STABLE skip-list', () => {
  it('entries are regexes, so a condition is matched rather than compared', () => {
    expect(STABLE.every(entry => entry instanceof RegExp)).toBe(true)
  })

  it('does not classify a live layout flag as stable', () => {
    expect(isStable('isMobile')).toBe(false)
    expect(isStable('!effectiveStoryOptionsVisible')).toBe(false)
    expect(isStable('layoutStore.settings.storyListVisible')).toBe(false)
  })

  it('classifies the story properties the legitimate groups switch on', () => {
    expect(isStable('storyStore.currentStory.layout.type === \'grid\'')).toBe(true)
    expect(isStable('shown.story.layout?.iframe === false')).toBe(true)
    expect(isStable('storyStore.currentStory.docsOnly')).toBe(true)
  })
})

// A condition is stable only if *every* operand is. Asking whether it mentions
// something per-story lets a live flag ride in on the back of a `&&`, which is
// #600 wearing a per-story condition as cover.
describe('a compound condition', () => {
  it('is unstable when one operand is a live flag', () => {
    expect(isStable('currentStory && !isMobile')).toBe(false)
    expect(isStable('shown.story.layout || isMobile')).toBe(false)
  })

  it('fails the group rather than passing on the per-story half', () => {
    const files = [{
      file: 'X.vue',
      source: wrap('<div v-if="currentStory && !isMobile"><RouterView /></div><div v-else><RouterView /></div>'),
    }]

    expect(problemsIn(files)).toHaveLength(1)
  })

  it('stays stable when every operand is per-story', () => {
    expect(isStable('storyStore.currentStory || storyStore.currentVariant')).toBe(true)
    expect(isStable('storyStore.currentStory && !storyStore.currentStory.docsOnly')).toBe(true)
    expect(isStable('shown.story.layout?.type === \'single\' && shown.story.layout.iframe === false')).toBe(true)
  })

  it('drops literals rather than treating them as operands', () => {
    expect(operandsOf('layout.type === \'grid\'')).toEqual(['layout.type'])
    expect(operandsOf('depth > 0 && story')).toEqual(['depth', 'story'])
  })
})

// PREVIEW_ROOTS already listed `RouterView` and `router-view`, so the kebab
// spelling was anticipated in one place and not in reachability.
describe('a component used in kebab-case', () => {
  it('still reaches the preview', () => {
    const files = [
      { file: 'Outer.vue', source: wrap('<story-viewer />') },
      { file: 'StoryViewer.vue', source: wrap('<StoryVariantSinglePreviewNative />') },
    ]

    expect(previewReaching(files).has(canonical('Outer'))).toBe(true)
  })

  it('fails a group that switches it on a live flag', () => {
    const files = [
      { file: 'App.vue', source: wrap('<div v-if="isMobile"><story-viewer /></div><div v-else><story-viewer /></div>') },
      { file: 'StoryViewer.vue', source: wrap('<StoryVariantSinglePreviewNative />') },
    ]

    expect(problemsIn(files)).toHaveLength(1)
  })

  it('gives the two spellings one name', () => {
    expect(canonical('story-viewer')).toBe(canonical('StoryViewer'))
  })
})
