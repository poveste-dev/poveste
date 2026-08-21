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
 */
export function stringifyState(value: unknown, space?: number) {
  // Ancestors, not everything seen: the same object appearing twice as a
  // sibling is a shared reference, not a cycle, and is perfectly serialisable.
  // The replacer's `this` is the holder, which is what lets the stack unwind.
  const ancestors: any[] = []

  return JSON.stringify(value, function (this: any, _key, current) {
    if (typeof current === 'function') {
      return '[Function]'
    }

    if (typeof current === 'bigint') {
      return current.toString()
    }

    if (current === null || typeof current !== 'object') {
      return current
    }

    if (typeof Node !== 'undefined' && current instanceof Node) {
      return '[Node]'
    }

    if (typeof Window !== 'undefined' && current instanceof Window) {
      return '[Window]'
    }

    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
      ancestors.pop()
    }

    if (ancestors.includes(current)) {
      return '[Circular]'
    }

    ancestors.push(current)

    return current
  }, space)
}
