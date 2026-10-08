import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// StackBlitz's WebContainer has no global `Iterator`, and jsdom 30.1 extends it
// when it loads (#1238). This file takes the global and its helpers away before
// anything imports jsdom, which is why `env.js` is imported inside the test: a
// static import would load jsdom first, and the test would prove nothing.
const HELPERS = ['map', 'filter', 'take', 'drop', 'flatMap', 'reduce', 'toArray', 'forEach', 'some', 'every', 'find']
const IteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()))
const saved = ['constructor', ...HELPERS].map(name => [name, Object.getOwnPropertyDescriptor(IteratorPrototype, name)] as const)
const savedGlobal = Object.getOwnPropertyDescriptor(globalThis, 'Iterator')

Reflect.deleteProperty(globalThis, 'Iterator')
for (const name of HELPERS) {
  Reflect.deleteProperty(IteratorPrototype, name)
}

afterAll(() => {
  for (const [name, descriptor] of saved) {
    if (descriptor) {
      Object.defineProperty(IteratorPrototype, name, descriptor)
    }
  }
  if (savedGlobal) {
    Object.defineProperty(globalThis, 'Iterator', savedGlobal)
  }
})

const Iterator = () => Reflect.get(globalThis, 'Iterator') as any

function* numbers(n: number) {
  for (let i = 1; i <= n; i++) {
    yield i
  }
}

describe('on a runtime with no global Iterator', () => {
  it('collects: jsdom loads, and its iterator-backed lookups work', async () => {
    const { createDomEnv } = await import('../dom/env.js')
    const env = createDomEnv()
    try {
      const { document } = env.window
      document.title = 'Hello Poveste'

      // Both go through jsdom's `ChildrenIterator`/`DescendantsIterator` and `find`.
      expect(document.title).toBe('Hello Poveste')
      expect(document.body).not.toBeNull()
    }
    finally {
      env.destroy()
    }
  })
})

describe('the Iterator it installs', () => {
  beforeAll(() => import('../dom/iterator.js'))

  it('can be extended, and cannot be constructed directly', () => {
    class Counter extends Iterator() {
      n = 0
      next() {
        return this.n < 3 ? { done: false, value: ++this.n } : { done: true, value: undefined }
      }
    }

    expect(new Counter().toArray()).toEqual([1, 2, 3])
    expect(() => new (Iterator())()).toThrow(TypeError)
  })

  it('gives every iterator the lazy helpers', () => {
    expect(numbers(6).filter((n: number) => n % 2 === 0).map((n: number) => n * 10).toArray()).toEqual([20, 40, 60])
    expect(numbers(6).drop(2).take(2).toArray()).toEqual([3, 4])
    expect(numbers(2).flatMap((n: number) => [n, n]).toArray()).toEqual([1, 1, 2, 2])
  })

  it('gives every iterator the eager helpers', () => {
    const seen: number[] = []
    numbers(3).forEach((n: number) => seen.push(n))

    expect(seen).toEqual([1, 2, 3])
    expect(numbers(4).reduce((sum: number, n: number) => sum + n)).toBe(10)
    expect(numbers(4).reduce((sum: number, n: number) => sum + n, 5)).toBe(15)
    expect(numbers(4).some((n: number) => n > 3)).toBe(true)
    expect(numbers(4).every((n: number) => n > 3)).toBe(false)
    expect(numbers(4).find((n: number) => n > 2)).toBe(3)
    expect(numbers(4).find((n: number) => n > 9)).toBeUndefined()
  })

  it('stops reading at the limit, and closes what it stops reading', () => {
    let reads = 0
    let closed = false
    const source = {
      __proto__: Iterator().prototype,
      next: () => ({ done: false, value: ++reads }),
      return: () => {
        closed = true
        return { done: true }
      },
    }

    expect(source.take(2).toArray()).toEqual([1, 2])
    expect(reads).toBe(2)
    expect(closed).toBe(true)
  })

  it('wraps a plain iterator with Iterator.from', () => {
    let n = 0
    const plain = { next: () => (n < 2 ? { done: false, value: ++n } : { done: true, value: undefined }) }

    expect(Iterator().from(plain).map((x: number) => x * 2).toArray()).toEqual([2, 4])
  })
})
