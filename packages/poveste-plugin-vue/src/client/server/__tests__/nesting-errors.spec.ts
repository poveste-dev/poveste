// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createApp, h } from 'vue'
import Story from '../Story.js'
import Variant from '../Variant.js'

/*
 * What a story author gets for a nesting mistake in collect mode, where the
 * stack has nothing in it about stories (#981).
 *
 * Mounted the way `run.ts` mounts them — a bare `createApp` — rather than
 * through a test-utils wrapper, because the missing provider is the whole
 * subject and a harness that supplies one would prove nothing.
 */
function mountAlone(component: any, props: Record<string, unknown> = {}) {
  const app = createApp({ render: () => h(component, props) })
  const el = document.createElement('div')
  try {
    app.mount(el)
  }
  finally {
    app.unmount()
  }
}

describe('a <Variant> outside a <Story>', () => {
  it('says which component it needed, when it carries an id', () => {
    // The branch that generates an id already threw a good error, so an
    // explicit id was the case that reached `undefined(variant)` and said
    // `addVariant is not a function`.
    expect(() => mountAlone(Variant, { id: 'mine', title: 'Solo' })).toThrow(/<Variant>.*<Story>/)
  })

  it('says the same thing when it does not', () => {
    expect(() => mountAlone(Variant, { title: 'Solo' })).toThrow(/<Variant>.*<Story>/)
  })

  it('never reports that a function is not a function', () => {
    expect(() => mountAlone(Variant, { id: 'mine', title: 'Solo' })).not.toThrow(/is not a function/)
  })
})

describe('a <Story> outside the collect runner', () => {
  it('says which provider it needed', () => {
    // `hstStoryFile` comes from `run.ts`, the only thing that mounts these.
    expect(() => mountAlone(Story, { title: 'Solo' })).toThrow(/<Story>/)
  })
})
