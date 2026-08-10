import { applyState } from '@poveste/shared'
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

/**
 * Synchronize states between the bundled and external/user versions of Vue
 * @param bundledState Reactive state created with the bundled Vue
 * @param externalState Reactive state created with the external/user Vue
 */
export function syncStateBundledAndExternal(bundledState, externalState) {
  // `syncing` means "the next firing on the other side is the echo of a write I
  // just made, ignore it". The subtlety, and the whole of #95, is that it is
  // only safe to set when a firing is actually coming.
  //
  // It used to be set unconditionally, on the assumption that every apply
  // provokes exactly one counterpart firing. Nothing enforced that. A change
  // `applyState` cannot express — a removed key is the simplest — provokes none,
  // and the flag then sat set through the next genuine edit and swallowed it.
  //
  // What held the assumption up in practice was an accident: `applyState`
  // rebuilt every object it copied, so any state carrying an object or an array
  // triggered the far side whether or not a value had moved. Vue stories always
  // carry `_hPropState` and `_hPropDefs`, so in this plugin it never actually
  // bit — which is exactly why the issue had no repro, and why making
  // `applyState` skip no-op writes had to come with this change rather than
  // before it.
  //
  // `applyState` now reports whether it wrote, and that is what the flag holds.
  let syncing = false

  const _stop = _watch(() => bundledState, (value) => {
    if (value == null) return
    if (syncing) {
      syncing = false
      return
    }
    syncing = applyState(externalState, _toRawDeep(value))
  }, {
    deep: true,
    immediate: true,
  })

  const stop = watch(() => externalState, (value) => {
    if (value == null) return
    if (syncing) {
      syncing = false
      return
    }
    syncing = applyState(bundledState, toRawDeep(value))
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
