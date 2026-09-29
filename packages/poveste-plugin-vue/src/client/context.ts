import type { InjectionKey } from 'vue'
import { inject as vueInject, provide as vueProvide } from 'vue'

/**
 * A context keyed by a symbol, with its provide and its inject in one place.
 *
 * Six of these used to be string keys carrying `any`, and two of the six were
 * the same string meaning two different things in two realms (#981). A symbol
 * cannot collide and the type travels with it.
 *
 * `inject` and `injectOptional` are separate functions rather than one call with a
 * default, because "nobody provided this" and "this is allowed to be absent"
 * are different questions that used to arrive as the same `undefined` — and the
 * first one is what an author hits when they nest a component wrongly.
 *
 * Reka's `createContext` is this shape and is already a dependency of the
 * controls package. It is not one of this package's, and this is fifteen lines,
 * so it is written here rather than taking a dependency for it.
 */
export interface Context<T> {
  provide: (value: T) => void
  /** Throws, naming the provider, when nothing provided it. */
  inject: (consumer: string) => T
  /** `null` when nothing provided it, which the caller is expected to handle. */
  injectOptional: () => T | null
}

/**
 * `description` is what a symbol shows in a stack; `provider` is the component
 * a reader has to go and add, and is the only part of the error they can act on.
 *
 * The key comes from the global registry rather than being minted here, because
 * this module is evaluated more than once. A collection worker's module graph is
 * invalidated while a story is mid-run, so `provide` and `inject` can each hold
 * their own instance of this file — a plain `Symbol()` then differs between them
 * and the injection misses, which reads as a `<Variant>` outside its `<Story>`.
 * Every description here is already unique, so the registry cannot re-collide
 * the way the string keys in #981 did.
 *
 * Absence is read as `null` rather than `undefined` so that a provider passing
 * `undefined` on purpose is still a provider. None does today, and this is the
 * cheaper of the two mistakes to have made.
 */
export function createContext<T>(description: string, provider: string): Context<T> {
  const key: InjectionKey<T> = Symbol.for(description)

  return {
    provide(value) {
      vueProvide(key, value)
    },

    inject(consumer) {
      const value = vueInject(key, null)

      if (value === null) {
        throw new Error(`[poveste] a ${consumer} has to be inside a ${provider}`)
      }

      return value
    },

    injectOptional() {
      return vueInject(key, null)
    },
  }
}
