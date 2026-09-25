import { clone, isMarkedRaw, isPlainObject, omit } from '@poveste/shared'
import { isRef, unref } from 'vue'

const isObject = (val: unknown): val is object => val !== null && typeof val === 'object'

/**
 * A value the caller must leave out rather than carry, because it cannot make
 * the trip this copy is being made for.
 */
const DROP = Symbol('poveste.drop')

/**
 * A detached copy of `val`, with refs unwrapped.
 *
 * `clean` means the copy leaves the realm — it is posted to the other side of
 * the sandbox bridge, or stored as a preset — so values that cannot survive
 * that are dropped rather than carried: functions, and anything Vue has marked
 * raw.
 *
 * Marked values are dropped rather than passed through, because `__v_skip` is
 * non-enumerable and does not cross `structuredClone`. Handing one over would
 * strip the mark and hand the far side a plain graph to deep-watch, which is
 * how the first attempt at #957 turned a slow story into a hanging one. A key
 * the sandbox never sends is a key the controls panel does not show, and for
 * the case this aims at — a template ref onto a component's exposed object —
 * that is a control nobody could have used anyway.
 *
 * Without `clean` the copy stays in this realm, so a marked value is carried by
 * reference. That is what the two Vues' bridge wants: an identity both sides
 * share, which `isEquivalent` then settles by `Object.is` instead of walking.
 */
export function toRawDeep(val: unknown, clean = false, seen: WeakMap<object, any> = new WeakMap()): any {
  const value = walk(val, clean, seen)

  // Only a nested key is ever dropped. A state object that is itself marked
  // would otherwise leave here as the sentinel.
  return value === DROP ? {} : value
}

function walk(val: unknown, clean: boolean, seen: WeakMap<object, any>): any {
  const unwrappedValue = isRef(val) ? unref(val) : val

  if (typeof unwrappedValue === 'symbol') {
    return unwrappedValue.toString()
  }

  if (!isObject(unwrappedValue)) {
    return unwrappedValue
  }

  if (isMarkedRaw(unwrappedValue)) {
    return clean ? DROP : unwrappedValue
  }

  if (seen.has(unwrappedValue)) {
    return seen.get(unwrappedValue)
  }

  if (!Array.isArray(unwrappedValue) && !isPlainObject(unwrappedValue)) {
    return notPlain(unwrappedValue, clean, seen)
  }

  if (Array.isArray(unwrappedValue)) {
    const result: unknown[] = []
    seen.set(unwrappedValue, result)
    let list = unwrappedValue.map(value => walk(value, clean, seen))
    if (clean) {
      // Dropped the same way a function is, indices and all: an array that has
      // one of these in it comes out shorter, which is what has always happened
      // to an array of functions.
      list = list.filter(value => typeof value !== 'function' && value !== DROP)
    }
    result.push(...list)
    return result
  }
  else {
    const result = {}
    seen.set(unwrappedValue, result)
    toRawObject(unwrappedValue as Record<any, any>, result, clean, seen)
    return result
  }
}

/**
 * A value with a prototype of its own — a `Date`, a `Map`, a class instance.
 *
 * These used to fall past every branch into `toRawObject`, whose `Object.keys`
 * is empty for most of them, so they arrived as `{}` with no error and no
 * warning (#977). `postMessage` is structured clone, and structured clone
 * carries `Date`, `Map`, `Set`, `RegExp`, `Error`, typed arrays and `BigInt`
 * intact — so they were being destroyed here, before the transport that would
 * have carried them was ever reached.
 *
 * Structured clone is therefore the line, rather than a list authored here:
 * it is the boundary that actually exists, it needs no maintaining as the
 * platform adds types, and adopting it is what makes this walk agree with
 * `isEquivalent`, which refuses to compare anything that is not plain.
 *
 * Without `clean` the copy stays in this realm, so the value is carried by
 * reference — the same answer `copyState` in `@poveste/shared` gives, and the
 * identity `isEquivalent` then settles by `Object.is`.
 */
function notPlain(value: object, clean: boolean, seen: WeakMap<object, any>): any {
  if (!clean) {
    return value
  }

  if (value instanceof Map || value instanceof Set) {
    return walkCollection(value, seen)
  }

  try {
    const copy = structuredClone(value)
    seen.set(value, copy)
    return copy
  }
  catch {
    // `URL`, a DOM node, a `Promise`: structured clone refuses them, so passing
    // one through would turn a silent flattening into a thrown `DataCloneError`
    // mid-sync. Dropped the way a function is, and the key does not arrive.
    return DROP
  }
}

/**
 * `Map` and `Set`, walked rather than handed to `structuredClone`, for two
 * measured reasons.
 *
 * They hold user values, so this walk's own rules have to reach inside them: a
 * function or a marked value in a `Map` is the same problem it is in an array,
 * and an array already comes out shorter for it. Cloning the whole container
 * would carry a function straight into a `DataCloneError`, and would strip a
 * marked value's `__v_skip` and hand the far side a plain graph to deep-watch
 * — which is the hazard #974 exists to prevent.
 *
 * And these are the only types here that Vue proxies. `structuredClone` throws
 * `DataCloneError` on a reactive `Map` while the raw one clones fine, so a
 * `Map` in reactive state would be refused and dropped — a second silence
 * rather than a fix for the first. `Date`, `RegExp`, `Error` and typed arrays
 * are not proxied, so the path below never meets a proxy and needs no `toRaw`.
 */
function walkCollection(value: Map<any, any> | Set<any>, seen: WeakMap<object, any>): any {
  const keep = (walked: any) => walked !== DROP && typeof walked !== 'function'

  if (value instanceof Set) {
    const copy = new Set()
    seen.set(value, copy)
    for (const entry of value) {
      const walked = walk(entry, true, seen)
      if (keep(walked)) copy.add(walked)
    }
    return copy
  }

  const copy = new Map()
  seen.set(value, copy)
  for (const [key, entry] of value) {
    const walkedKey = walk(key, true, seen)
    const walked = walk(entry, true, seen)
    if (keep(walkedKey) && keep(walked)) copy.set(walkedKey, walked)
  }
  return copy
}

function toRawObject(obj: Record<any, any>, target: Record<any, any>, clean: boolean, seen: WeakMap<object, any>) {
  Object.keys(obj).forEach((key) => {
    if (clean && typeof obj[key] === 'function') {
      return
    }

    const value = walk(obj[key], clean, seen)

    if (value === DROP) {
      return
    }

    target[key] = value
  })
}

/**
 * A variant's state as a preset holds it: a detached deep copy, with the keys
 * a preset has no business storing dropped.
 *
 * The clean pass is what keeps `clone` from failing. A preset is a value — it
 * is persisted as JSON, so a function could never be part of one — and leaving
 * functions in made `structuredClone` throw `DataCloneError`, with the JSON
 * fallback behind it throwing again on the cycle a self-referential prop
 * produces. The copy came out correct anyway, because `toRawDeep` above had
 * already detached it, but every mount of such a story logged the failure —
 * a warning carrying the function's source, then an error — and paid for two
 * doomed clone attempts. `structuredClone` handles the cycle by itself once
 * the functions are gone.
 */
export function toPresetState(state: any, omitKeys: string[] = ['_hPropDefs']) {
  return clone(omit(toRawDeep(state, true), omitKeys))
}
