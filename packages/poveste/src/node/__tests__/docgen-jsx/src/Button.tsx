import type { Component, JSX } from 'solid-js'
import { mergeProps } from 'solid-js'

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * How loud the button is.
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * The button's colour.
   * @defaultValue 'neutral'
   */
  tone?: 'neutral' | 'danger'
  /** Shown when there is nothing to say. */
  label: string
  /** Called once the press lands. */
  onPress?: (count: number, source: 'mouse' | 'key') => void
  /** Drawn before the label. */
  icon?: JSX.Element
  /** @internal */
  debugId?: string
}

export const Button: Component<ButtonProps> = (props) => {
  const merged = mergeProps({ size: 'md', tone: 'danger' } as const, props, { label: props.label.trim() })
  return (
    <button data-size={merged.size}>
      {merged.label}
      {props.children}
    </button>
  )
}
