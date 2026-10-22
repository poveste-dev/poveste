import type { Snippet } from 'svelte'
import type { HTMLButtonAttributes } from 'svelte/elements'
import type { BaseProps } from './base'

export interface ButtonProps extends BaseProps, HTMLButtonAttributes {
  /** The text on the button. */
  label: string
  /**
   * How large the button is.
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg'
  /** Whether it is pressed, bound both ways. */
  pressed?: boolean
  /** Shown before the label. */
  icon?: Snippet<[size: string]>
  /** Called when the button is pressed. */
  onpress?: (event: MouseEvent) => void
  /** @internal */
  secret?: string
}
