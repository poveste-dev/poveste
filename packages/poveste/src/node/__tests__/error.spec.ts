import { MessageChannel } from 'node:worker_threads'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { deserializeError, serializeError } from '../collect/error.js'

/** Sends a value through a real structured clone, as a worker boundary does. */
function overAChannel(value: unknown) {
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    channel.port2.on('message', (received) => {
      channel.port1.close()
      channel.port2.close()
      resolve(received)
    })
    channel.port1.postMessage(value)
  })
}

async function roundTrip(error: unknown) {
  return deserializeError(await overAChannel(serializeError(error)))
}

describe('serializeError', () => {
  it('carries the code frame a Vite transform error puts on `frame`', async () => {
    // The whole point: the collector prints `error.frame` when there is one, and
    // a plain structured clone drops it.
    const thrown = Object.assign(new Error('Unexpected token'), {
      frame: '1 | <template>\n  |  ^',
      id: '/src/Broken.vue',
      plugin: 'vite:vue',
    })

    const received = await roundTrip(thrown) as Error & { frame?: string, id?: string, plugin?: string }

    expect(received.frame).toBe('1 | <template>\n  |  ^')
    expect(received.id).toBe('/src/Broken.vue')
    expect(received.plugin).toBe('vite:vue')
  })

  it('keeps what a structured clone already kept', async () => {
    const thrown = new TypeError('not a function')

    const received = await roundTrip(thrown) as Error

    expect(received).toBeInstanceOf(Error)
    expect(received.name).toBe('TypeError')
    expect(received.message).toBe('not a function')
    expect(received.stack).toBe(thrown.stack)
  })

  it('carries a nested cause', async () => {
    const thrown = new Error('collect failed', { cause: Object.assign(new Error('inner'), { frame: 'x' }) })

    const received = await roundTrip(thrown) as Error & { cause?: Error & { frame?: string } }

    expect(received.cause?.message).toBe('inner')
    expect(received.cause?.frame).toBe('x')
  })

  it('leaves a stackless error with the stack it was rebuilt with', async () => {
    // `stack` is writable and can be absent; assigning `undefined` would erase the
    // one `new Error` just produced and leave nothing to print.
    const thrown = new Error('no stack here')
    delete (thrown as { stack?: string }).stack

    const received = await roundTrip(thrown) as Error

    expect(received.message).toBe('no stack here')
    expect(typeof received.stack).toBe('string')
  })

  it('drops a property the clone would reject rather than losing the error', async () => {
    // A function on an error takes the whole `postMessage` down with a
    // DataCloneError, which is a worse outcome than losing the property.
    const thrown = Object.assign(new Error('Unexpected token'), {
      frame: '1 | <template>',
      retry: () => {},
    })

    const received = await roundTrip(thrown) as Error & { frame?: string, retry?: unknown }

    expect(received.message).toBe('Unexpected token')
    expect(received.frame).toBe('1 | <template>')
    expect(received.retry).toBeUndefined()
  })

  it('carries a jsdom DOMException, which is not a genuine error object', async () => {
    /*
     * What a story's own DOM call throws — an invalid selector, an invalid
     * `appendChild`. Two things have to be true at once for this to be lost, and
     * both are true of the collection environment (#1097):
     *
     * `runScripts: 'dangerously'`, as `createDomEnv` sets, makes jsdom a separate
     * realm, so the exception fails `instanceof Error` against this one. And
     * jsdom's `DOMException` is a webidl2js object rather than a genuine error, so
     * `Error.isError` is false for it too — which is why the predicate here cannot
     * be either of those. Its name and message live in internal slots and its
     * `stack` is non-enumerable, so a clone of it retains nothing at all, and the
     * host received `{}`.
     *
     * Without `runScripts` the same call is an ordinary Node-realm object and
     * `instanceof Error` is true, which is how this reads as working.
     */
    const dom = new JSDOM('<!DOCTYPE html>', { runScripts: 'dangerously' })
    let thrown: unknown
    try {
      dom.window.document.querySelector('[[[')
    }
    catch (error) {
      thrown = error
    }

    const received = await roundTrip(thrown) as Error

    // Being a real `Error` on arrival is what the printing path depends on:
    // `collect/index.ts` asks `e instanceof Error` before it reaches for a stack,
    // and this is what makes that true without changing it.
    expect(received).toBeInstanceOf(Error)
    expect(received.name).toBe('SyntaxError')
    expect(received.message).toContain('Invalid selector')
    expect(received.stack).toBe((thrown as Error).stack)
  })

  it('leaves an object that only carries a name and a message as the data it is', async () => {
    // The boundary of the predicate above, and the reason it asks for a `stack`
    // too: `{ name, message }` is a shape a story may legitimately throw, and it
    // should arrive as itself rather than rebuilt into an `Error`.
    const received = await roundTrip({ name: 'nope', message: 'still data' })

    expect(received).not.toBeInstanceOf(Error)
    expect(received).toEqual({ name: 'nope', message: 'still data' })
  })

  it('passes a non-error through, and stringifies one a clone would reject', async () => {
    expect(await roundTrip('just a string')).toBe('just a string')
    expect(await roundTrip(() => {})).toBe('() => {}')
  })
})

describe('a cause that points back into its own chain', () => {
  it('serializes an error whose cause is itself', () => {
    // `structuredClone` carries a cycle; this walk is the only thing that cannot,
    // and it runs on the path that reports a failure — so overflowing here would
    // replace the error it was called to describe with its own stack overflow.
    const error = new Error('went wrong')
    error.cause = error

    const round = deserializeError(serializeError(error)) as Error

    expect(round.message).toBe('went wrong')
  })

  it('serializes a pair of errors that cause each other', () => {
    const first = new Error('first')
    const second = new Error('second')
    first.cause = second
    second.cause = first

    const round = deserializeError(serializeError(first)) as Error & { cause?: Error }

    expect(round.message).toBe('first')
    expect(round.cause?.message).toBe('second')
  })

  it('keeps a cause that is merely repeated, not circular', () => {
    // The same error under two keys is not a cycle, and the second sight of it
    // still has to carry its own name and message.
    const shared = new Error('shared')
    const error = Object.assign(new Error('outer'), { cause: shared, other: shared })

    const round = deserializeError(serializeError(error)) as Error & { cause?: Error, other?: Error }

    expect(round.cause?.message).toBe('shared')
  })
})
