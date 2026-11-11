import type { Component } from 'vue'
import type { ControlElementInternals } from './internals.js'
import { defineCustomElement, h, ref, shallowReactive, shallowRef, toRaw } from 'vue'
import ControlHost from './ControlHost.vue'
import { INTERNALS } from './internals.js'

/** Dispatched on a control element once a render has called its slots; read `slotCalls` then. */
export const CONTROL_SLOTS_EVENT = 'poveste-slots'

/** Marks the node a wrapper rendered for `slotCalls[n]`, with `n` as its value. */
export const SLOT_CONTENT_ATTR = 'data-poveste-slot-content'

const SLOT_OUTLET_ATTR = 'data-poveste-slot-outlet'

export interface ControlSlotCall {
  name: string
  props: Record<string, unknown>
}

/**
 * A builtin control as a custom element, for a framework whose components are not Vue's.
 *
 * The control renders once `props` is set, with everything in it — its props, the
 * attributes it passes on, and listeners — as a Vue parent would give them. Each event
 * it emits is also dispatched on the element as a `CustomEvent` whose `detail` is the
 * argument list.
 *
 * Slot content stays the wrapper's to render: name the slots it has in `slots`, render
 * one node per entry of `slotCalls` marked with `SLOT_CONTENT_ATTR`, inside `slotSource`,
 * and the element moves each into the place the control rendered that slot.
 */
export interface ControlElement extends HTMLElement {
  props: Record<string, unknown> | undefined
  slots: readonly string[]
  readonly slotCalls: readonly ControlSlotCall[]
  slotSource: Element | null
}

/** `HstColorSelect` is `<poveste-hst-color-select>`. */
export function controlElementTag(name: string): string {
  return `poveste-${name.replace(/[A-Z]/g, (letter, index: number) => (index ? '-' : '') + letter.toLowerCase())}`
}

function emitsOf(control: Component): string[] {
  const emits = (control as { emits?: string[] | Record<string, unknown> }).emits
  if (!emits) {
    return []
  }
  return Array.isArray(emits) ? emits : Object.keys(emits)
}

function sameCalls(a: readonly ControlSlotCall[], b: readonly ControlSlotCall[]) {
  return a.length === b.length && a.every((call, index) => {
    const other = b[index]!
    const keys = Object.keys(call.props)
    return call.name === other.name
      && keys.length === Object.keys(other.props).length
      && keys.every(key => Object.is(call.props[key], other.props[key]))
  })
}

let nextElementId = 0

export function defineControlElement(control: Component): CustomElementConstructor {
  const Base = defineCustomElement(ControlHost, { shadowRoot: false })

  return class ControlElementImpl extends Base implements ControlElement {
    [INTERNALS]: ControlElementInternals

    #id = String(nextElementId++)
    #calls: readonly ControlSlotCall[] = []
    #pending: ControlSlotCall[] | null = null
    #source: Element | null = null
    #sourceObserver: MutationObserver | null = null
    #contents = new Map<string, Element>()

    constructor() {
      super()
      this[INTERNALS] = {
        control,
        emits: emitsOf(control),
        ready: ref(false),
        props: shallowReactive<Record<string, unknown>>({}),
        slotNames: shallowRef([]),
        slotOutlet: (name, props) => h('span', {
          [SLOT_OUTLET_ATTR]: `${this.#id}:${this.#record(name, props)}`,
          style: { display: 'contents' },
        }),
      }
    }

    get props() {
      const internals = this[INTERNALS]
      return internals.ready.value ? { ...toRaw(internals.props) } : undefined
    }

    // Key by key, so handing over an equal object does not render the control again.
    set props(next) {
      const internals = this[INTERNALS]
      const store = internals.props
      for (const key of Object.keys(store)) {
        if (!next || !(key in next)) {
          delete store[key]
        }
      }
      Object.assign(store, next)
      internals.ready.value = next != null
    }

    get slots() {
      return this[INTERNALS].slotNames.value
    }

    set slots(names) {
      const current = this[INTERNALS].slotNames
      const next = names ?? []
      if (next.length !== current.value.length || next.some((name, index) => name !== current.value[index])) {
        current.value = [...next]
      }
    }

    get slotCalls() {
      return this.#calls
    }

    get slotSource() {
      return this.#source
    }

    set slotSource(source) {
      if (source === this.#source) {
        return
      }
      this.#sourceObserver?.disconnect()
      this.#source = source
      this.#sourceObserver = null
      if (source) {
        this.#sourceObserver = new MutationObserver(() => this.#fill())
        this.#sourceObserver.observe(source, { childList: true })
        this.#fill()
      }
    }

    // A control calls its slots while it renders, which can be its own render rather
    // than the host's, so the calls are collected until the render is over.
    #record(name: string, props: Record<string, unknown>) {
      if (!this.#pending) {
        this.#pending = []
        queueMicrotask(() => this.#publish())
      }
      return this.#pending.push({ name, props }) - 1
    }

    #publish() {
      const calls = this.#pending ?? []
      this.#pending = null
      const changed = !sameCalls(calls, this.#calls)
      this.#calls = calls
      if (changed) {
        this.dispatchEvent(new Event(CONTROL_SLOTS_EVENT))
      }
      this.#fill()
    }

    #fill() {
      if (this.#source) {
        for (const node of this.#source.children) {
          const id = node.getAttribute(SLOT_CONTENT_ATTR)
          if (id != null) {
            this.#contents.set(id, node)
          }
        }
      }
      const prefix = `${this.#id}:`
      for (const outlet of this.querySelectorAll(`[${SLOT_OUTLET_ATTR}^="${prefix}"]`)) {
        const content = this.#contents.get(outlet.getAttribute(SLOT_OUTLET_ATTR)!.slice(prefix.length))
        if (content && content.parentNode !== outlet) {
          outlet.replaceChildren(content)
        }
      }
    }
  }
}

/**
 * Registers each control as `controlElementTag(name)`. Safe to call from every realm
 * and every app: a document defines each element once and keeps the first definition.
 */
export function defineControlElements(
  controls: Record<string, Component>,
  registry: CustomElementRegistry | undefined = globalThis.customElements,
) {
  if (!registry) {
    return
  }
  for (const [name, control] of Object.entries(controls)) {
    const tag = controlElementTag(name)
    if (!registry.get(tag)) {
      registry.define(tag, defineControlElement(control))
    }
  }
}
