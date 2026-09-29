/*
 * Errors cross a worker boundary by structured clone, which keeps an `Error`'s
 * `name`, `message` and `stack` and drops every own property beyond them. A Vite
 * transform error carries its code frame on `frame`, so the collector's
 * `error.frame ? … : error.stack` branch had never once seen a frame (#1020).
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

// A property the clone would reject takes the whole message down with it, which
// is worse than losing the property. Vite's own are strings and plain objects.
function cloneable(value: unknown) {
  try {
    structuredClone(value)
    return true
  }
  catch {
    return false
  }
}

export function serializeError(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return cloneable(error) ? error : String(error)
  }

  const props: Record<string, unknown> = {}
  for (const key of Object.getOwnPropertyNames(error)) {
    if (key === 'name' || key === 'message' || key === 'stack') {
      continue
    }
    const value = (error as unknown as Record<string, unknown>)[key]
    if (key === 'cause') {
      props[key] = serializeError(value)
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
  // Assigning `undefined` would read as "this error has no stack" rather than
  // "the one it crossed with had none".
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
