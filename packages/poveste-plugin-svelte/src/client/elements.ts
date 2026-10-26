// MEASUREMENT ONLY (#1114) — not for merge.
import { components } from '@poveste/controls'
import { defineCustomElement } from '@poveste/vendors/vue'

const tags = new Map<unknown, string>()

for (const [key, component] of Object.entries(components)) {
  const tag = `pvt-${key.replace(/[A-Z]/g, (c, i) => (i ? '-' : '') + c.toLowerCase())}`
  tags.set(component, tag)
  if (!customElements.get(tag)) {
    customElements.define(tag, defineCustomElement(component as any, { shadowRoot: false }))
  }
}

export function controlTag(component: unknown): string {
  return tags.get(component)!
}
