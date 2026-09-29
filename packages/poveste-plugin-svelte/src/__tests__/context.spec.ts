import { describe, expect, it } from 'vitest'
import { createContext } from '../context.js'

describe('createContext', () => {
  it('gives two instances of the same context one key', () => {
    // A collection worker evaluates this module more than once — its graph is
    // invalidated while a story is mid-run — so `set` and `get` can each hold
    // their own instance. A key minted per instance differs between them and the
    // lookup misses, which surfaces as `lifecycle_outside_component`.
    expect(createContext('poveste-test-context', '<X>').key)
      .toBe(createContext('poveste-test-context', '<X>').key)
  })

  it('keeps two contexts apart when their descriptions differ', () => {
    // What #981 was: one key meaning two things.
    expect(createContext('poveste-test-one', '<X>').key).not.toBe(createContext('poveste-test-two', '<X>').key)
  })
})
