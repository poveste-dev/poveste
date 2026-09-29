import { describe, expect, it, vi } from 'vitest'

/*
 * A collection worker evaluates the context modules more than once — its graph is
 * invalidated while a story is mid-run — so the provider and the consumer can each
 * hold their own instance of one file. The key is what has to survive that: minted
 * per instance it differs between them, the injection misses, and the reader is
 * told their `<Variant>` is outside a `<Story>`.
 *
 * Vue's own `provide`/`inject` are stubbed because they need a mounted component
 * and this package's tests have no DOM; the key they are handed is the subject.
 */
const provided: unknown[] = []
const injected: unknown[] = []

vi.mock('vue', () => ({
  provide: (key: unknown) => {
    provided.push(key)
  },
  inject: (key: unknown) => {
    injected.push(key)
    return null
  },
}))

const { createContext } = await import('../context.js')

function keyOf(description: string) {
  createContext(description, '<Story>').provide('anything')
  return provided.at(-1)
}

describe('createContext', () => {
  it('gives two instances of the same context one key', () => {
    expect(keyOf('poveste-test-context')).toBe(keyOf('poveste-test-context'))
  })

  it('keeps two contexts apart when their descriptions differ', () => {
    // What #981 was: one key meaning two things.
    expect(keyOf('poveste-test-one')).not.toBe(keyOf('poveste-test-two'))
  })

  it('injects under the key it provides under', () => {
    const context = createContext<string>('poveste-test-round-trip', '<Story>')
    context.provide('the story file')
    context.injectOptional()

    expect(injected.at(-1)).toBe(provided.at(-1))
  })
})
