// Chrome ends the sentence with a period and Firefox does not, so these are
// prefixes rather than whole messages.
const RESIZE_OBSERVER_LOOP = [
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
]

/**
 * A ResizeObserver loop notification is the browser saying it deferred a resize
 * callback to the next frame, not a component throwing. It reaches the `error`
 * event with a null `error`, so reporting `event.error ?? event.message` blames
 * the story that happens to be rendering for it (#468). Requiring the null keeps
 * a genuine `throw` of the same text reportable.
 */
export function isBenignResizeObserverEvent({ error, message }: { error?: unknown, message?: unknown }): boolean {
  return error == null
    && typeof message === 'string'
    && RESIZE_OBSERVER_LOOP.some(known => message.startsWith(known))
}
