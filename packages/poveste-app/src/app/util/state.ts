import { clone, omit } from '@poveste/shared'
import { isRef, unref } from 'vue'

const isObject = val => val !== null && typeof val === 'object'

export function toRawDeep(val, clean = false, seen = new WeakMap()) {
  const unwrappedValue = isRef(val) ? unref(val) : val

  if (typeof unwrappedValue === 'symbol') {
    return unwrappedValue.toString()
  }

  if (!isObject(unwrappedValue)) {
    return unwrappedValue
  }

  if (seen.has(unwrappedValue)) {
    return seen.get(unwrappedValue)
  }

  if (Array.isArray(unwrappedValue)) {
    const result = []
    seen.set(unwrappedValue, result)
    let list = unwrappedValue.map(value => toRawDeep(value, clean, seen))
    if (clean) {
      list = list.filter(value => typeof value !== 'function')
    }
    result.push(...list)
    return result
  }
  else {
    const result = {}
    seen.set(unwrappedValue, result)
    toRawObject(unwrappedValue, result, clean, seen)
    return result
  }
}

function toRawObject(obj: Record<any, any>, target: Record<any, any>, clean = false, seen = new WeakMap()) {
  Object.keys(obj).forEach((key) => {
    if (clean && typeof obj[key] === 'function') {
      return
    }
    target[key] = toRawDeep(obj[key], clean, seen)
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
