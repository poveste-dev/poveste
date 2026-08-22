import { describe, expect, it } from 'vitest'
import { createStateBridge } from '../app/util/state-bridge.js'

// A stand-in for `postMessage`: messages queue rather than being delivered, so a
// test can put two of them in flight at once — which is the whole point. Real
// `postMessage` gives the same shape, one task apart, which is exactly how long
// it takes for both sides to have written before either has heard.
function link() {
  const queues = { host: [] as any[], sandbox: [] as any[] }
  const state = { host: {} as any, sandbox: {} as any }

  const bridges = {
    host: createStateBridge(changes => queues.sandbox.push(changes)),
    sandbox: createStateBridge(changes => queues.host.push(changes)),
  }

  return {
    state,
    /** The side's state changed; it composes and sends. */
    send(side: 'host' | 'sandbox') {
      bridges[side].send(structuredClone(state[side]))
    },
    /** Deliver everything currently in flight to the given side. */
    deliver(side: 'host' | 'sandbox') {
      const inbox = queues[side].splice(0)
      for (const changes of inbox) {
        bridges[side].receive(state[side], changes)
      }
    },
    settle() {
      for (let i = 0; i < 6; i++) {
        this.deliver('host')
        this.send('host')
        this.deliver('sandbox')
        this.send('sandbox')
      }
    },
  }
}

describe('createStateBridge', () => {
  it('carries an edit in each direction', () => {
    const bridge = link()
    bridge.state.host = { a: 0, b: 0 }
    bridge.state.sandbox = { a: 0, b: 0 }
    bridge.settle()

    bridge.state.host.a = 1
    bridge.send('host')
    bridge.deliver('sandbox')
    expect(bridge.state.sandbox.a).toBe(1)

    bridge.state.sandbox.b = 2
    bridge.send('sandbox')
    bridge.deliver('host')
    expect(bridge.state.host.b).toBe(2)
  })

  it('does not echo what it was just sent', () => {
    const bridge = link()
    bridge.state.host = { a: 0 }
    bridge.state.sandbox = { a: 0 }
    bridge.settle()

    bridge.state.host.a = 1
    bridge.send('host')
    bridge.deliver('sandbox')

    // The sandbox's own watcher fires on the write it just applied. It has
    // nothing of its own to report, so nothing goes back.
    bridge.send('sandbox')
    expect(bridge.state.host.a).toBe(1)
    bridge.deliver('host')
    expect(bridge.state.host.a).toBe(1)
  })

  it('keeps both edits when the two sides write before either has heard', () => {
    // The race, exactly: both write, both compose, then both deliver. Sending
    // the whole state here meant each message carried its sender's stale copy of
    // the other's key, and each end applied that over its own fresh value — so
    // the two sides ended up disagreeing with nothing left to settle it.
    const bridge = link()
    bridge.state.host = { label: 'start', bumps: 0 }
    bridge.state.sandbox = { label: 'start', bumps: 0 }
    bridge.settle()

    bridge.state.host.label = 'raced'
    bridge.state.sandbox.bumps = 1
    bridge.send('host')
    bridge.send('sandbox')

    bridge.deliver('host')
    bridge.deliver('sandbox')
    bridge.settle()

    expect(bridge.state.host).toEqual({ label: 'raced', bumps: 1 })
    expect(bridge.state.sandbox).toEqual({ label: 'raced', bumps: 1 })
  })

  it('does not revert the sender when the receiver refuses the write', () => {
    // `applyState` swallows a write a setter refuses — a read-only `computed` in
    // state is the case that occurs — and reports it as written anyway. Agreeing
    // to it regardless is worse than losing it: the receiver still holds the old
    // value, its next firing diffs that against a baseline claiming the new one,
    // and it comes back as a fresh edit that reverts the sender. The reader's
    // control edit undoes itself with nothing to show for it.
    const queues: any = { host: [], sandbox: [] }
    const host: any = { a: 0 }
    const sandbox: any = {}
    Object.defineProperty(sandbox, 'a', { get: () => 0, enumerable: true, configurable: true })

    const hostBridge = createStateBridge(changes => queues.sandbox.push(changes))
    const sandboxBridge = createStateBridge(changes => queues.host.push(changes))

    hostBridge.send({ ...host })
    for (const changes of queues.sandbox.splice(0)) sandboxBridge.receive(sandbox, changes)

    host.a = 1
    hostBridge.send({ a: 1 })
    for (const changes of queues.sandbox.splice(0)) sandboxBridge.receive(sandbox, changes)

    // The sandbox refused it, so its own next firing still reads 0.
    sandboxBridge.send({ a: sandbox.a })
    for (const changes of queues.host.splice(0)) hostBridge.receive(host, changes)

    expect(host.a).toBe(1)
  })

  it('leaves a simultaneous write to the same key unresolved, as it always did', () => {
    // Not something a diff can fix, and not something this changed. Both ends
    // accept what the other sent, so the two values swap. Landing them on one
    // value needs each end to know which of its own writes the other has seen
    // yet — acknowledgements, a real protocol — and picking a winner without
    // that would mean dropping legitimate later edits from the losing side.
    //
    // Recorded here so the limit is a decision rather than a surprise. Writing
    // the same key from the story and the panel in one task is a genuine
    // conflict; writing *different* keys, which is the case above, is not.
    const bridge = link()
    bridge.state.host = { a: 0 }
    bridge.state.sandbox = { a: 0 }
    bridge.settle()

    bridge.state.host.a = 1
    bridge.state.sandbox.a = 2
    bridge.send('host')
    bridge.send('sandbox')
    bridge.deliver('host')
    bridge.deliver('sandbox')
    bridge.settle()

    expect(bridge.state.host.a).toBe(2)
    expect(bridge.state.sandbox.a).toBe(1)
  })
})
