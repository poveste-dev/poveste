import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import LooseChild from '../__fixtures__/LooseChild.svelte'

/*
 * What a story author gets for a nesting mistake in collect mode (#981), and
 * the same four cases `plugin-vue` covers — the two plugins report this
 * identically and a reader moving between them should not learn two sentences.
 *
 * Through a fixture because `collect/Variant.svelte` is script-only, and read
 * through `.body` because Svelte 5 renders lazily: `render()` returns before
 * the component runs, so a `try` around the call alone catches nothing and the
 * spec passes for no reason.
 */
function collect(props: Record<string, unknown>) {
  return render(LooseChild as any, { props }).body
}

describe('a <Variant> outside a <Story>', () => {
  it('says which component it needed, when it carries an id', () => {
    // This path reached `addVariant(variant)` on undefined and said
    // `addVariant is not a function`.
    expect(() => collect({ id: 'mine' })).toThrow(/<Variant>.*<Story>/)
  })

  it('says the same thing when it does not', () => {
    // And this one read `story.id` with no guard at all, so it said
    // `Cannot read properties of undefined`.
    expect(() => collect({})).toThrow(/<Variant>.*<Story>/)
  })

  it('never reports that a function is not a function', () => {
    expect(() => collect({ id: 'mine' })).not.toThrow(/is not a function/)
  })
})
