import type { JSX } from 'solid-js'

export function Badge(props: { tone: 'info' | 'warn', children: JSX.Element }) {
  return <span class={`badge badge-${props.tone}`}>{props.children}</span>
}
