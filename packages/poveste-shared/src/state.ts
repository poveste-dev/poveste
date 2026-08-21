export function clone(data) {
  try {
    return structuredClone(data)
  }
  catch (e) {
    console.warn(e, `Fallback to JSON cloning`)
    try {
      return JSON.parse(JSON.stringify(data))
    }
    catch (e) {
      console.error(e)
    }
    return data
  }
}

export function omit(data, keys: string[]) {
  const copy = {}
  for (const key in data) {
    if (!keys.includes(key)) {
      copy[key] = data[key]
    }
  }
  return copy
}

function isPlainObject(value: any) {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Structural comparison, deliberately narrow: it recurses into plain objects and
 * arrays and compares everything else by `Object.is`.
 *
 * That narrowness is the point. Anything with a prototype of its own — a `Date`,
 * a `Map`, a class instance, a DOM node — carries state that own enumerable keys
 * do not describe, and two distinct `Date`s would otherwise compare equal on an
 * empty key list. Reporting "not equivalent" for those is the safe answer: the
 * caller writes, which is what it did before this existed.
 *
 * `Object.is` is not an arbitrary choice either — it is exactly the predicate
 * Vue's `hasChanged` uses, so a value this reports as equivalent is a value Vue
 * would have refused to trigger on anyway.
 */
export function isEquivalent(a: any, b: any, seen?: WeakMap<object, WeakSet<object>>): boolean {
  if (Object.is(a, b)) {
    return true
  }

  const bothArrays = Array.isArray(a) && Array.isArray(b)

  if (!bothArrays && !(isPlainObject(a) && isPlainObject(b))) {
    return false
  }

  if (bothArrays && a.length !== b.length) {
    return false
  }

  // State is user data and can be cyclic. A pair already on the stack is
  // assumed equivalent — the usual co-inductive treatment, and it terminates.
  const visited = seen ?? new WeakMap<object, WeakSet<object>>()
  let peers = visited.get(a)

  if (peers?.has(b)) {
    return true
  }

  if (!peers) {
    peers = new WeakSet<object>()
    visited.set(a, peers)
  }

  peers.add(b)

  const keys = Object.keys(a)

  if (keys.length !== Object.keys(b).length) {
    return false
  }

  return keys.every(key => Object.hasOwn(b, key) && isEquivalent(a[key], b[key], visited))
}

/**
 * Copies `state` onto `target`, and reports whether it wrote anything.
 *
 * The return value is what the syncs in `plugin-svelte` and the sandbox bridge
 * use to decide whether to expect an echo. Each holds a flag meaning "the next
 * firing is mine, ignore it", and that flag is only safe to set when a firing is
 * actually coming. See #95.
 *
 * `plugin-vue` no longer needs it: `createStateBaseline` recognises an echo by
 * it not being a change, so there is no flag left to keep honest. The two are
 * the same idea at different strengths, and the others can move across (#96).
 */
export function applyState(target: any, state: any, override = false) {
  let wrote = false

  for (const key in state) {
    const current = target[key]

    // Skip writes that cannot change anything. Vue drops a re-assigned primitive
    // on its own, but never an object: `state` here has always been rebuilt by a
    // `toRawDeep`/`clone` on the way in, so assigning one lands a fresh identity
    // over an equal-but-distinct old one, and triggers every watcher on it.
    //
    // Those spurious triggers were load-bearing, which is the whole of #95 — the
    // syncs counted on them to keep their flags alternating. Skipping them is
    // both the efficiency win and the thing that makes `wrote` mean something.
    //
    // The key has to exist first. `undefined` is equivalent to `undefined`, so a
    // key the target does not have yet and whose incoming value is `undefined`
    // would otherwise never be created — and a story that declares its shape
    // upfront (`initState: () => ({ pending: undefined })`) would get no control
    // for it, because the panel lists the keys the state actually has.
    if (Object.hasOwn(target, key) && isEquivalent(current, state[key])) {
      continue
    }

    // iframe sync needs to update properties without overriding them
    if (!override && current && !key.startsWith('_h') && typeof current === 'object' && !Array.isArray(current)) {
      // Not `Object.assign`, because the reason the two are not equivalent may
      // be a key that `current` has and `state[key]` does not — a removal, which
      // this merge cannot express. Assigning the rest would then change nothing
      // while still looking like a write, and a caller that took that for a
      // write would wait for an echo that never comes. Compare per key and
      // report only what actually moved.
      let merged = false

      for (const nested in state[key]) {
        if (isEquivalent(current[nested], state[key][nested])) {
          continue
        }

        try {
          current[nested] = state[key][nested]
          merged = true
        }
        catch {
          // noop
        }
      }

      if (!merged) {
        continue
      }
    }
    else {
      try {
        target[key] = state[key]
      }
      catch {
        // noop
      }
    }

    wrote = true
  }

  return wrote
}

/**
 * The nested keys of `after` that differ from `before`, or `null` for none.
 *
 * One level, and no deeper, because that is exactly how far `applyState` merges:
 * it walks the keys of a nested object and assigns each, so a value handed to it
 * at depth two is written whole. Narrow past that and the write lands the narrow
 * subset *as* the object and takes its siblings with it.
 */
function narrowState(before: any, after: any): Record<string, any> | null {
  let changes: Record<string, any> | null = null

  for (const key in after) {
    if (Object.hasOwn(before, key) && isEquivalent(before[key], after[key])) {
      continue
    }

    changes ??= {}
    changes[key] = after[key]
  }

  return changes
}

/**
 * The subset of `next` that differs from `baseline`, shaped so `applyState` can
 * copy it faithfully: a key it will merge is narrowed to the nested keys that
 * moved, and everything else is carried whole. `null` when nothing changed.
 *
 * The narrowing is what lets two sides edit one object at once without either
 * clobbering the other — whatever is not sent cannot be overwritten — so it has
 * to line up with `applyState`'s merge rule exactly. `applyState` merges a plain
 * object one level down, and skips `_h`-prefixed keys because the sandbox needs
 * those replaced rather than merged; this narrows on the same terms, so those
 * keys still cross whole and concurrent edits *inside* one of them still race.
 * Ordinary story state does not live there.
 *
 * Only keys `next` has are considered. A key `baseline` has and `next` does not
 * is a removal, which `applyState` cannot express, so reporting it would produce
 * a write that changes nothing — and, worse, one the baseline would go on
 * reporting forever. Removals stay unmirrored, exactly as they were.
 */
export function diffState(baseline: any, next: any): Record<string, any> | null {
  let changes: Record<string, any> | null = null

  for (const key in next) {
    const before = baseline[key]
    const after = next[key]
    const known = Object.hasOwn(baseline, key)

    if (known && isEquivalent(before, after)) {
      continue
    }

    let value = after

    if (known && !key.startsWith('_h') && isPlainObject(before) && isPlainObject(after)) {
      value = narrowState(before, after)

      // Only a removal, then. Nothing to send.
      if (value === null) {
        continue
      }
    }

    changes ??= {}
    changes[key] = value
  }

  return changes
}

/**
 * A structural copy, narrow in exactly the way `isEquivalent` is: plain objects
 * and arrays get fresh containers, everything else is carried by reference —
 * which is right, because those are the values `isEquivalent` compares by
 * `Object.is`, so a reference is the identity the comparison is about.
 */
function copyState(value: any, seen = new WeakMap<object, any>()) {
  if (!Array.isArray(value) && !isPlainObject(value)) {
    return value
  }

  if (seen.has(value)) {
    return seen.get(value)
  }

  const copy: any = Array.isArray(value) ? [] : {}
  seen.set(value, copy)

  for (const key in value) {
    copy[key] = copyState(value[key], seen)
  }

  return copy
}

/**
 * Records `changes` — the shape `diffState` returns — into `baseline`, on the
 * same terms `applyState` writes it: merge the one narrowed level, take
 * everything under it whole. Keys the diff did not mention survive, which is
 * what keeps a removal the far side could not mirror from being replayed.
 *
 * Copies on the way in. The same `changes` object goes to `applyState`, which
 * assigns its values straight into a reactive state; sharing them would let a
 * later write through that state's proxy mutate the baseline as well, and a
 * baseline that tracks a live side reports every one of that side's edits as
 * already agreed — which is to say, drops them.
 */
function recordState(baseline: any, changes: any) {
  for (const key in changes) {
    const value = changes[key]

    if (isPlainObject(value) && isPlainObject(baseline[key])) {
      for (const nested in value) {
        baseline[key][nested] = copyState(value[nested])
      }
    }
    else {
      baseline[key] = copyState(value)
    }
  }
}

/**
 * Tracks the last state both sides of a sync agreed on.
 *
 * The syncs used to mirror whole state objects and coordinate with a boolean
 * meaning "the next firing is my own echo, ignore it". That has two costs. An
 * echo is only distinguishable from a genuine edit by counting firings, which
 * is what made the flag load-bearing and fragile (#95). And a side that mirrors
 * everything it holds also mirrors the keys it did *not* change, stale by one
 * edit if the far side changed them in the same tick — so the second firing
 * reverted the first side's edit and it was lost from both (#96).
 *
 * A baseline answers both. Ask it for what a side changed and it reports that
 * side's own edits, never the far side's; an echo diffs to nothing and needs no
 * flag to recognise, because it is not a change.
 */
export function createStateBaseline() {
  const baseline: Record<string, any> = {}

  return {
    /**
     * What `next` changed since both sides last agreed, or `null` for nothing.
     * The changes count as agreed from here, so ask once per firing and mirror
     * what you get.
     */
    take(next: any): Record<string, any> | null {
      const changes = diffState(baseline, next)

      if (changes) {
        recordState(baseline, changes)
      }

      return changes
    },
  }
}
