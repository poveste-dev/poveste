import { describe, expect, it } from 'vitest'
import { isBenignResizeObserverEvent } from '../app/util/uncaught'

/**
 * The shape the sandbox's `error` listener sees. A browser-emitted
 * ResizeObserver notification carries a null `error`; a real throw carries the
 * `Error` that was thrown.
 */
const notification = (message: string) => ({ error: null, message })
const thrown = (message: string) => ({ error: new Error(message), message: `Uncaught Error: ${message}` })

describe('a ResizeObserver loop notification', () => {
  // Chrome's exact wording, trailing period included, as captured from a live
  // observer loop.
  it('is recognised as benign with the period Chrome sends', () => {
    expect(isBenignResizeObserverEvent(notification('ResizeObserver loop completed with undelivered notifications.'))).toBe(true)
  })

  it('is recognised as benign without the period Firefox omits', () => {
    expect(isBenignResizeObserverEvent(notification('ResizeObserver loop completed with undelivered notifications'))).toBe(true)
  })

  it('is recognised as benign in the older loop limit wording', () => {
    expect(isBenignResizeObserverEvent(notification('ResizeObserver loop limit exceeded'))).toBe(true)
  })
})

describe('an error the sandbox exists to report', () => {
  it('is not treated as benign when a component throws the same text', () => {
    expect(isBenignResizeObserverEvent(thrown('ResizeObserver loop completed with undelivered notifications'))).toBe(false)
  })

  it('is not treated as benign when an unrelated script fails with no error object', () => {
    expect(isBenignResizeObserverEvent(notification('Script error.'))).toBe(false)
  })
})
