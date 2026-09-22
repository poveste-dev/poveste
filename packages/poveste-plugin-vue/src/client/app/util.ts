import type { ComponentInternalInstance } from 'vue'
import { applyState, createStateBaseline, isMarkedRaw } from '@poveste/shared'
import {
  isRef as _isRef,
  unref as _unref,
  watch as _watch,
} from '@poveste/vendors/vue'
import { getCurrentInstance, isReadonly, isRef, unref, watch } from 'vue'

const isObject = (val: unknown): val is object => val !== null && typeof val === 'object'

/**
 * A value Vue has marked raw is carried by reference rather than rebuilt.
 *
 * Both sides of this bridge live in one realm, so the reference is the useful
 * thing to hand over: the baseline then holds the same identity the next pass
 * reads, `isEquivalent` settles it by `Object.is`, and nothing walks whatever
 * is behind it. Rebuilding it was ten of the twenty traversals a keystroke
 * cost (#957).
 *
 * The bridge that leaves this realm cannot do the same — see `toRawDeep` in
 * `poveste-app`, where the mark does not survive the crossing and the key is
 * dropped instead.
 */
/**
 * Using external/user Vue
 */
export function toRawDeep(val: unknown, seen = new WeakMap()): any {
  const unwrappedValue = isRef(val) ? unref(val) : val

  if (typeof unwrappedValue === 'symbol') {
    return unwrappedValue.toString()
  }

  if (!isObject(unwrappedValue)) {
    return unwrappedValue
  }

  if (isMarkedRaw(unwrappedValue)) {
    return unwrappedValue
  }

  if (seen.has(unwrappedValue)) {
    return seen.get(unwrappedValue)
  }

  if (Array.isArray(unwrappedValue)) {
    const result: unknown[] = []
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
export function _toRawDeep(val: unknown, seen = new WeakMap()): any {
  const unwrappedValue = _isRef(val) ? _unref(val) : val

  if (typeof unwrappedValue === 'symbol') {
    return unwrappedValue.toString()
  }

  if (!isObject(unwrappedValue)) {
    return unwrappedValue
  }

  if (isMarkedRaw(unwrappedValue)) {
    return unwrappedValue
  }

  if (seen.has(unwrappedValue)) {
    return seen.get(unwrappedValue)
  }

  if (Array.isArray(unwrappedValue)) {
    const result: unknown[] = []
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
export function syncStateBundledAndExternal(bundledState: Record<string, any>, externalState: Record<string, any>, omit: string[] = []) {
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

/** The component being set up. Throws outside `setup`, where Vue returns null. */
/**
 * Whether a `<script setup>` binding can be story state a control drives.
 *
 * A readonly ref cannot: the write-back is refused, so the two sides of the
 * bridge never agree on it and the sync re-walks forever (#959). `useTemplateRef`
 * returns one — in dev builds only, which is why a built book is quiet and the
 * mode story authors work in is not.
 *
 * It has to be asked of the ref rather than of what the ref holds. The guard
 * beside this one tests the value, and a value test cannot classify a template
 * ref at all: at setup time it holds `null`, and what it will hold later is not
 * knowable from here. Readonly-ness is a property of the ref itself and is
 * settled by the time the binding is registered.
 *
 * A `computed` is caught by the same rule and for the same reason — it is a
 * derived value, and a control that cannot write is not a control. Before this
 * it appeared in the panel and warned when written.
 */
export function isWritableBinding(value: unknown): boolean {
  return !(isRef(value) && isReadonly(value))
}

export function useInstance(name: string): ComponentInternalInstance {
  const vm = getCurrentInstance()
  if (!vm) {
    throw new Error(`[poveste] <${name}> can only be set up inside a component`)
  }
  return vm
}
