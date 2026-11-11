import type { Component, Ref, ShallowRef, VNode } from 'vue'

export const INTERNALS = Symbol('poveste:control-element')

/** What `ControlHost` reads off the element it renders in. */
export interface ControlElementInternals {
  control: Component
  emits: readonly string[]
  /** False until a wrapper has set `props`, so a control never renders without its required props. */
  ready: Ref<boolean>
  props: Record<string, unknown>
  slotNames: ShallowRef<readonly string[]>
  slotOutlet: (name: string, props: Record<string, unknown>) => VNode
}

export interface HostedControlElement extends HTMLElement {
  [INTERNALS]: ControlElementInternals
}
