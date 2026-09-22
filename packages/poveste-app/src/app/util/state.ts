import { clone, isMarkedRaw, omit } from '@poveste/shared'
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
export function toRawDeep(val: unknown, clean = false, seen = new WeakMap()): any {
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
