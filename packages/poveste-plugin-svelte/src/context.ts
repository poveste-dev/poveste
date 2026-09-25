import { getContext, setContext } from 'svelte'

/**
 * A context keyed by a symbol, with its set and its get in one place.
 *
 * Ten of these were string keys carrying `any` (#981). Svelte's context map
 * takes any key, so a symbol costs nothing and the type travels with it.
 *
 * `get` and `getOptional` are separate functions rather than one call with a
 * default, because "nobody set this" and "this is allowed to be absent" are
 * different questions that arrived as the same `undefined` — and the first is
 * what an author hits when they nest a component wrongly.
 *
 * The same helper, the same split and the same sentence as `plugin-vue`'s, so
 * the two plugins report a nesting mistake identically. Only the underlying
 * primitive differs: `setContext`/`getContext` rather than `provide`/`inject`.
 */
export interface Context<T> {
  key: symbol
  set: (value: T) => void
  /** Throws, naming the provider, when nothing set it. */
  get: (consumer: string) => T
  /** `null` when nothing set it, which the caller is expected to handle. */
  getOptional: () => T | null
}

/**
 * `description` is what the symbol shows in a stack; `provider` is the
 * component a reader has to go and add, and is the only part of the message
 * they can act on.
 *
 * `key` is exposed because the collect runner seeds its contexts through a
 * `Map` handed to `mount`, which is not a component and so cannot call `set`.
 */
export function createContext<T>(description: string, provider: string): Context<T> {
  const key = Symbol(description)

  return {
    key,

    set(value) {
      setContext(key, value)
    },

    get(consumer) {
      const value = getContext<T | undefined>(key)

      if (value === undefined || value === null) {
        throw new Error(`[poveste] a ${consumer} has to be inside a ${provider}`)
      }

      return value
    },

    getOptional() {
      return getContext<T | undefined>(key) ?? null
    },
  }
}
