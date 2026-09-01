import { describe, expect, it } from 'vitest'
import { compareMirror, MIRRORS } from './check-mirrored-conformance.ts'

const source = new Map([['Button.story.vue', 'a'], ['Grid.story.vue', 'b']])

describe('compareMirror', () => {
  it('is silent when the mirror is a copy', () => {
    expect(compareMirror(source, new Map(source))).toEqual([])
  })

  // The defect this exists for: edit one of a pair, and the failure lands in a
  // book you did not touch as a missing locator (#400).
  it('names a file whose content has drifted', () => {
    const mirror = new Map(source).set('Button.story.vue', 'edited')

    expect(compareMirror(source, mirror)).toEqual([{ file: 'Button.story.vue', reason: 'differs' }])
  })

  it('catches a story added to the source and not the mirror', () => {
    const mirror = new Map(source)
    mirror.delete('Grid.story.vue')

    expect(compareMirror(source, mirror)).toEqual([{ file: 'Grid.story.vue', reason: 'missing' }])
  })

  // A story left behind in the mirror after being deleted from the source is
  // drift too, and the direction the shared story list would not notice.
  it('catches a story left behind in the mirror', () => {
    const mirror = new Map(source).set('Old.story.vue', 'x')

    expect(compareMirror(source, mirror)).toEqual([{ file: 'Old.story.vue', reason: 'extra' }])
  })

  // Intended divergence is a real category — `I18n` and `BaseButton` diverge on
  // purpose elsewhere in these books — so it has to be nameable, not forbidden.
  it('honours an exception, scoped to the mirror it names', () => {
    const mirror = new Map(source).set('Button.story.vue', 'deliberately different')
    const exceptions = new Set(['examples/nuxt4/app/components/conformance/Button.story.vue'])

    expect(compareMirror(source, mirror, exceptions, 'examples/nuxt4/app/components/conformance')).toEqual([])
    // The same filename in another mirror is not covered by it.
    expect(compareMirror(source, mirror, exceptions, 'examples/sveltekit/src/lib/conformance')).toHaveLength(1)
  })

  it('reports every drifted file rather than only the first', () => {
    const mirror = new Map([['Button.story.vue', 'x'], ['Grid.story.vue', 'y']])

    expect(compareMirror(source, mirror)).toHaveLength(2)
  })
})

describe('mIRRORS', () => {
  // A moved directory would otherwise make the check quietly compare nothing.
  it('names both pairs, source first', () => {
    expect(MIRRORS.map(m => `${m.source} -> ${m.mirror}`)).toEqual([
      'examples/vue3/src/conformance -> examples/nuxt4/app/components/conformance',
      'examples/svelte5/src/conformance -> examples/sveltekit/src/lib/conformance',
    ])
  })
})
