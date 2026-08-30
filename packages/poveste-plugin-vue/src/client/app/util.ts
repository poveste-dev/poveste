import { applyState, createStateBaseline } from '@poveste/shared'
import {
  isRef as _isRef,
  unref as _unref,
  watch as _watch,
} from '@poveste/vendors/vue'
import { isRef, unref, watch } from 'vue'

const isObject = val => val !== null && typeof val === 'object'

/**
 * Using external/user Vue
 */
export function toRawDeep(val, seen = new WeakMap()) {
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
    result.push(...unwrappedValue.map(value => toRawDeep(value, seen)))
    return result
  }
  else {
    const result = {}
    seen.set(unwrappedValue, result)
    toRawObject(unwrappedValue, result, seen)
    return result
  }
}

function toRawObject(obj: Record<any, any>, target: Record<any, any>, seen = new WeakMap()) {
  Object.keys(obj).forEach((key) => {
    target[key] = toRawDeep(obj[key], seen)
  })
}

/**
 * Using bundled Vue
 */
export function _toRawDeep(val, seen = new WeakMap()) {
  const unwrappedValue = _isRef(val) ? _unref(val) : val

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
    result.push(...unwrappedValue.map(value => _toRawDeep(value, seen)))
    return result
  }
  else {
    const result = {}
    seen.set(unwrappedValue, result)
    _toRawObject(unwrappedValue, result, seen)
    return result
  }
}

function _toRawObject(obj: Record<any, any>, target: Record<any, any>, seen = new WeakMap()) {
  Object.keys(obj).forEach((key) => {
    target[key] = toRawDeep(obj[key], seen)
  })
}

// Kept out of the baseline rather than out of the write, so the far side is
// never told these changed and an echo cannot carry them back.
function without(state: Record<string, any>, omit: string[]): Record<string, any> {
  if (!omit.length) {
    return state
  }
  const kept = { ...state }
  for (const key of omit) {
    delete kept[key]
  }
  return kept
}

/**
 * Synchronize states between the bundled and external/user versions of Vue
 * @param bundledState Reactive state created with the bundled Vue
 * @param externalState Reactive state created with the external/user Vue
 * @param omit Keys neither side may learn from the other
 */
export function syncStateBundledAndExternal(bundledState, externalState, omit: string[] = []) {
  // Each side is asked only for what *it* changed, and that is all that crosses.
  //
  // Both watchers used to mirror the whole of their side. That works while the
  // edits take turns, and coordinating the echoes needed a shared `syncing`
  // boolean that had to be right about whether a firing was coming — the whole
  // of #95. It stops working the moment both sides change in the same tick: the
  // second watcher to fire carries not just its own edit but its stale copy of
  // the other side's key, and writes the first edit back out from under it. The
  // edit was not delayed, it was gone, from both sides (#96).
  //
  // A baseline of the last agreed state answers both. It is what the far side is
  // known to hold, so diffing against it yields this side's own edits and never
  // the far side's — there is nothing stale left to send. And an echo diffs to
  // nothing, so no flag is needed to recognise one; the boolean is gone, and
  // with it the question of what happens when the alternation slips.
  const baseline = createStateBaseline()

  const _stop = _watch(() => bundledState, (value) => {
    if (value == null) return
    const changes = baseline.take(without(_toRawDeep(value), omit))
    if (changes) applyState(externalState, changes)
  }, {
    deep: true,
    immediate: true,
  })

  const stop = watch(() => externalState, (value) => {
    if (value == null) return
    const changes = baseline.take(without(toRawDeep(value), omit))
    if (changes) applyState(bundledState, changes)
  }, {
    deep: true,
    immediate: true,
  })

  return {
    stop() {
      _stop()
      stop()
    },
  }
}
