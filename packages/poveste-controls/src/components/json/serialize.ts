import { isPlainObject } from '@poveste/shared'

/**
 * `JSON.stringify` for values that were never promised to be JSON.
 *
 * State reaches this control straight out of a story's own scope, so it holds
 * whatever a `<script setup>` holds: a function, a DOM node, an object that
 * refers back to itself. `JSON.stringify` throws on the cycle, and it throws
 * from inside a lifecycle hook — which takes the rest of that flush with it, so
 * the panel and the toolbar beside it never mount. A marker in the editor is
 * the smaller loss, and it is what the story events pane already does.
 *
 * Nodes and windows are named rather than walked. Both are cyclic, so the guard
 * below would terminate on them, but only after walking a few thousand
 * properties of `window` on every keystroke.
 *
 * Past `MAX_OBJECTS` the rest is named too. A shared reference is walked each
 * time it appears, so an app instance such as `useNuxtApp()` expands without
 * end, and this runs synchronously on the thread the preview iframe shares
 * (#788).
 *
 * Every other type with a prototype of its own is named as well — a `Date`, a
 * `Map`, a `RegExp`, a class instance. Those *are* expressible as JSON in the
 * sense that `JSON.stringify` produces something for them, which is exactly the
 * problem: a `Date` renders as a quoted ISO string and a `Map` as `{}`, neither
 * distinguishable from a value the reader may edit. Parsing that back writes a
 * string over the `Date` and a plain object over the `Map` (#977).
 */
const MAX_OBJECTS = 5000

export function stringifyState(value: unknown, space?: number) {
  return serializeState(value, space).doc
}

/**
 * `stringifyState`, and whether the document *is* the value.
 *
 * `faithful` is false as soon as anything was named rather than written out —
 * a marker, or the budget cutting the rest short. Such a document is a view of
 * the value and not the value, so nothing may parse it back into the model:
 * doing so replaces whatever each marker stands for with its label.
 */
export function serializeState(value: unknown, space?: number): { doc: string, faithful: boolean } {
  // Ancestors, not everything seen: the same object appearing twice as a
  // sibling is a shared reference, not a cycle, and is perfectly serialisable.
  // The replacer's `this` is the holder, which is what lets the stack unwind.
  const ancestors: any[] = []
  let walked = 0
  let faithful = true

  const named = (label: string) => {
    faithful = false
    return `[${label}]`
  }

  const doc = JSON.stringify(value, function (this: any, key, current) {
    // What the holder actually keeps. `JSON.stringify` calls `toJSON` before the
    // replacer, so a `Date` and a `URL` arrive here already flattened into the
    // string that hides them. The root is reachable the same way: the spec hands
    // the replacer a `{ '': value }` wrapper as `this`.
    const raw = held(this, key, current)

    if (typeof raw === 'function') {
      return named('Function')
    }

    if (typeof raw === 'bigint') {
      return named(`BigInt ${raw}`)
    }

    if (raw === null || typeof raw !== 'object') {
      return current
    }

    if (typeof Node !== 'undefined' && raw instanceof Node) {
      return named('Node')
    }

    if (typeof Window !== 'undefined' && raw instanceof Window) {
      return named('Window')
    }

    // Named with what the type is about rather than by name alone: a `Map` and
    // a `Set` both write out as `{}`, and a `RegExp` too, so the size and the
    // pattern are the whole of what the reader came for.
    if (raw instanceof Map) {
      return named(`Map(${raw.size})`)
    }

    if (raw instanceof Set) {
      return named(`Set(${raw.size})`)
    }

    if (raw instanceof RegExp) {
      return named(`RegExp ${raw}`)
    }

    if (raw instanceof Error) {
      return named(`${raw.name}: ${raw.message}`)
    }

    if (ArrayBuffer.isView(raw)) {
      const view = raw as ArrayBufferView & { length?: number }
      return named(`${typeName(view)}(${view.length ?? view.byteLength})`)
    }

    if (!Array.isArray(raw) && !isPlainObject(raw)) {
      return named(describe(raw, current))
    }

    // `current`, not `raw`. This stack has to hold exactly the objects that
    // become `this` for their children, and what a child sees is the value
    // *returned* here — so recording anything else unwinds the stack against a
    // node that is not on it, pops the real ancestors with it, and leaves the
    // guard blind for the rest of the walk. `JSON.stringify` then meets the
    // cycle itself and throws, out of a lifecycle hook, which is the failure
    // this whole replacer exists to avoid.
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
      ancestors.pop()
    }

    if (ancestors.includes(current)) {
      return named('Circular')
    }

    if (++walked > MAX_OBJECTS) {
      return named('Truncated')
    }

    ancestors.push(current)

    return current
  }, space)

  return { doc, faithful }
}

/**
 * The value the holder keeps under `key`, which is not always the one the
 * replacer was handed: `JSON.stringify` calls `toJSON` first, so a `Date` and a
 * `URL` arrive flattened into the string that hides them.
 *
 * Only a primitive can be `toJSON` output standing in for something — an object
 * `current` is the value itself — so that is the only case worth looking up,
 * which keeps every object and array to the single read `JSON.stringify`
 * already made. That matters here: this runs on the thread the preview shares,
 * over graphs the size of a `useNuxtApp()` (#788).
 *
 * And the descriptor is consulted before the read, because `holder[key]` would
 * run an accessor a second time. State is user data and a getter is free to
 * count its reads, to throw on the second, or to be a `computed` whose
 * recomputation is the expensive thing — none of which may happen because a
 * control is drawing itself. An inherited or accessor property therefore keeps
 * the name it had before #977, which is the honest trade.
 */
function held(holder: any, key: string, current: unknown) {
  if (current === null || typeof current === 'object') {
    return current
  }

  try {
    // The descriptor decides whether the read is safe; the read itself still
    // goes through the holder, because a reactive proxy unwraps a `ref` on
    // `get` and the descriptor behind it would hand back the `ref` object.
    const own = Object.getOwnPropertyDescriptor(holder, key)
    return own && 'value' in own ? holder[key] : current
  }
  catch {
    // A proxy refusing the lookup outright.
    return current
  }
}

/**
 * A class instance, a typed array, a `URL` — anything else carrying a prototype
 * of its own.
 *
 * `toJSON` output is kept beside the constructor name where it is legible. A
 * `URL` reads out as its href and a `Date` as its ISO string, and the panel
 * showed exactly that before this: naming the type has to add to what the
 * reader could see, not replace it.
 */
function describe(value: object, current: unknown): string {
  const name = typeName(value)

  return typeof current === 'string' || typeof current === 'number'
    ? `${name} ${current}`
    : name
}

/** Guarded: a proxy is free to refuse the read, and the generic name is then the honest answer. */
function typeName(value: object): string {
  try {
    return value.constructor?.name || 'Object'
  }
  catch {
    return 'Object'
  }
}
