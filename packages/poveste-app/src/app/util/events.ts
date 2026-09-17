import { EVENT_SEND } from './const'
import { occupant } from './occupant'

export async function logEvent(name: string, argument: unknown) {
  const event = {
    name,
    argument: JSON.parse(stringifyEvent(argument)), // Needed for HTMLEvent that can't be cloned
  }
  if (location.href.includes('__sandbox')) {
    window.parent?.postMessage({
      type: EVENT_SEND,
      event,
      storyId: occupant.storyId,
      variantId: occupant.variantId,
    })
  }
  else {
    const { useEventsStore } = await import('../stores/events.js')
    useEventsStore().addEvent(event)
  }
}

function stringifyEvent(e: unknown) {
  const obj: Record<string, unknown> = {}
  // `for...in` rather than `Object.entries`: an event's fields are inherited.
  for (const k in e as object) {
    obj[k] = Reflect.get(e as object, k)
  }
  return JSON.stringify(obj, (k, v) => {
    if (v instanceof Node) return 'Node'
    if (v instanceof Window) return 'Window'
    return v
  }, ' ')
}
