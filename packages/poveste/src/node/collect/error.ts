/*
 * Structured clone keeps an `Error`'s `name`, `message` and `stack` and drops every
 * own property beyond them, so the code frame a Vite transform error puts on `frame`
 * never once survived the worker boundary (#1020).
 */

const MARK = 'pvt:error'

interface Serialized {
  kind: typeof MARK
  name: string
  message: string
  stack: string | undefined
  props: Record<string, unknown>
}

function isSerialized(value: unknown): value is Serialized {
  return typeof value === 'object' && value !== null && (value as Serialized).kind === MARK
}

// A property the clone rejects takes the whole message down with it, which is worse
// than dropping the property.
function cloneable(value: unknown) {
  try {
    structuredClone(value)
    return true
  }
  catch {
    return false
  }
}

/*
 * `seen` breaks a cause that points back into its own chain. `structuredClone`
 * carries a cycle happily; this walk is the only thing here that cannot, and it
 * runs on the path that reports a failure — so overflowing the stack would lose
 * the error it was called to describe and replace it with its own.
 */
export function serializeError(error: unknown, seen: WeakSet<Error> = new WeakSet()): unknown {
  if (!(error instanceof Error)) {
    return cloneable(error) ? error : String(error)
  }
  if (seen.has(error)) {
    // Named and described, without the cause that leads back here.
    return { kind: MARK, name: error.name, message: error.message, stack: error.stack, props: {} } satisfies Serialized
  }
  seen.add(error)

  const props: Record<string, unknown> = {}
  for (const key of Object.getOwnPropertyNames(error)) {
    if (key === 'name' || key === 'message' || key === 'stack') {
      continue
    }
    const value = (error as unknown as Record<string, unknown>)[key]
    if (key === 'cause') {
      props[key] = serializeError(value, seen)
    }
    else if (cloneable(value)) {
      props[key] = value
    }
  }

  return { kind: MARK, name: error.name, message: error.message, stack: error.stack, props } satisfies Serialized
}

export function deserializeError(value: unknown): unknown {
  if (!isSerialized(value)) {
    return value
  }

  const error = new Error(value.message)
  error.name = value.name
  // Assigning `undefined` would erase the stack `new Error` just gave this one.
  if (value.stack !== undefined) {
    error.stack = value.stack
  }
  for (const [key, prop] of Object.entries(value.props)) {
    Object.defineProperty(error, key, {
      value: key === 'cause' ? deserializeError(prop) : prop,
      writable: true,
      enumerable: true,
      configurable: true,
    })
  }
  return error
}
