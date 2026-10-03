import type { JSX, ParentProps } from 'solid-js'

export function Card({ elevation = 1, title }: ParentProps<{ elevation?: number, title: string }>): JSX.Element {
  return <section data-elevation={elevation}>{title}</section>
}
