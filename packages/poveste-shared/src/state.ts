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
 * The return value is what the state syncs in `plugin-vue`, `plugin-svelte` and
 * the sandbox bridge use to decide whether to expect an echo. Each of them holds
 * a flag meaning "the next firing is mine, ignore it", and that flag is only
 * safe to set when a firing is actually coming. See #95.
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
