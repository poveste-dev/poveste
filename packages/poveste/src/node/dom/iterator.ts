// StackBlitz's WebContainer reports Node 22.22.3 but has no global `Iterator`, and
// jsdom 30.1 extends it when it loads, so every story failed to collect there
// (#1238). Real Node has had it since 22.0 and never runs this.
//
// Vendored rather than core-js: core-js and core-js-pure both carry a postinstall,
// and pnpm 11 and 12 fail an install outright on a dependency's unapproved build
// script. The full ES2025 helper set rather than only the `find` jsdom calls
// today, so the next helper jsdom reaches for is already here.

interface Step { done?: boolean, value?: unknown }
interface AnyIterator { next: (...args: unknown[]) => Step, return?: () => unknown }
type Callback = (value: unknown, index: number) => unknown

const IteratorPrototype: object = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()))

function callable(fn: unknown, name: string): Callback {
  if (typeof fn !== 'function') {
    throw new TypeError(`Iterator.prototype.${name} expects a function`)
  }
  return fn as Callback
}

function count(value: unknown, name: string): number {
  const n = Number(value)
  if (Number.isNaN(n)) {
    throw new RangeError(`Iterator.prototype.${name} expects a number`)
  }
  const whole = Math.trunc(n)
  if (whole < 0) {
    throw new RangeError(`Iterator.prototype.${name} expects a non-negative number`)
  }
  return whole
}

// Closing after a callback threw keeps the callback's error, as the spec does.
function closeQuietly(iterator: AnyIterator): void {
  try {
    iterator.return?.()
  }
  catch {}
}

function guarded<T>(iterator: AnyIterator, run: () => T): T {
  try {
    return run()
  }
  catch (error) {
    closeQuietly(iterator)
    throw error
  }
}

/**
 * A lazy helper. `step` turns each value into what to yield, and `stop` ends it
 * before the next read. The underlying iterator is closed whenever this one ends
 * before it does.
 */
function lazy(iterator: AnyIterator, step: (value: unknown, index: number) => Iterable<unknown>, stop: () => boolean = () => false): Generator<unknown> {
  const next = iterator.next
  return (function* () {
    let exhausted = false
    try {
      for (let index = 0; !stop(); index++) {
        const result = next.call(iterator)
        if (result.done) {
          exhausted = true
          return
        }
        yield* guarded(iterator, () => step(result.value, index))
      }
    }
    finally {
      if (!exhausted) {
        closeQuietly(iterator)
      }
    }
  })()
}

/** An eager helper: `visit` returns true to stop, which closes the iterator. */
function each(iterator: AnyIterator, visit: (value: unknown, index: number) => boolean): void {
  const next = iterator.next
  for (let index = 0; ; index++) {
    const result = next.call(iterator)
    if (result.done) {
      return
    }
    if (guarded(iterator, () => visit(result.value, index))) {
      closeQuietly(iterator)
      return
    }
  }
}

function flattenable(value: unknown, name: string): Iterable<unknown> {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`Iterator.${name} expects an iterator or an iterable`)
  }
  const method = Reflect.get(value, Symbol.iterator) as (() => AnyIterator) | undefined
  const inner = method === undefined ? value as AnyIterator : method.call(value)
  return { [Symbol.iterator]: () => inner as unknown as Iterator<unknown> }
}

const helpers: Record<string, (this: AnyIterator, ...args: unknown[]) => unknown> = {
  map(fn) {
    const mapper = callable(fn, 'map')
    return lazy(this, (value, index) => [mapper(value, index)])
  },
  filter(fn) {
    const predicate = callable(fn, 'filter')
    return lazy(this, (value, index) => (predicate(value, index) ? [value] : []))
  },
  take(limit) {
    let remaining = count(limit, 'take')
    return lazy(this, (value) => {
      remaining--
      return [value]
    }, () => remaining === 0)
  },
  drop(limit) {
    let remaining = count(limit, 'drop')
    return lazy(this, (value) => {
      if (remaining > 0) {
        remaining--
        return []
      }
      return [value]
    })
  },
  flatMap(fn) {
    const mapper = callable(fn, 'flatMap')
    return lazy(this, (value, index) => flattenable(mapper(value, index), 'prototype.flatMap'))
  },
  reduce(fn, ...initial) {
    const reducer = callable(fn, 'reduce') as (accumulator: unknown, value: unknown, index: number) => unknown
    let accumulator = initial[0]
    let started = initial.length > 0
    each(this, (value, index) => {
      if (started) {
        accumulator = reducer(accumulator, value, index)
      }
      else {
        accumulator = value
        started = true
      }
      return false
    })
    if (!started) {
      throw new TypeError('Iterator.prototype.reduce of an empty iterator with no initial value')
    }
    return accumulator
  },
  toArray() {
    const out: unknown[] = []
    each(this, (value) => {
      out.push(value)
      return false
    })
    return out
  },
  forEach(fn) {
    const visit = callable(fn, 'forEach')
    each(this, (value, index) => {
      visit(value, index)
      return false
    })
  },
  some(fn) {
    const predicate = callable(fn, 'some')
    let found = false
    each(this, (value, index) => {
      found = Boolean(predicate(value, index))
      return found
    })
    return found
  },
  every(fn) {
    const predicate = callable(fn, 'every')
    let all = true
    each(this, (value, index) => {
      all = Boolean(predicate(value, index))
      return !all
    })
    return all
  },
  find(fn) {
    const predicate = callable(fn, 'find')
    let found: unknown
    each(this, (value, index) => {
      if (predicate(value, index)) {
        found = value
        return true
      }
      return false
    })
    return found
  },
}

/** Defines `globalThis.Iterator` and its helpers where the runtime has neither. */
export function installIterator(): void {
  if (typeof Reflect.get(globalThis, 'Iterator') !== 'undefined') {
    return
  }

  function Iterator(this: unknown): void {
    if (new.target === undefined || new.target === Iterator) {
      throw new TypeError('Iterator is an abstract class and cannot be constructed directly')
    }
  }
  Iterator.prototype = IteratorPrototype
  Object.defineProperty(IteratorPrototype, 'constructor', { value: Iterator, writable: true, configurable: true })
  Object.defineProperty(Iterator, 'from', {
    value(value: unknown) {
      const iterator = (typeof value === 'string' ? value : flattenable(value, 'from'))[Symbol.iterator]() as unknown as AnyIterator
      return Object.prototype.isPrototypeOf.call(IteratorPrototype, iterator) ? iterator : lazy(iterator, item => [item])
    },
    writable: true,
    configurable: true,
  })

  for (const [name, fn] of Object.entries(helpers)) {
    if (!(name in IteratorPrototype)) {
      Object.defineProperty(IteratorPrototype, name, { value: fn, writable: true, configurable: true })
    }
  }

  Object.defineProperty(globalThis, 'Iterator', { value: Iterator, writable: true, configurable: true })
}

installIterator()
