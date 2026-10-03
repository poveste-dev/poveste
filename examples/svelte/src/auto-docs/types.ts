import type { Snippet } from 'svelte'
import type { HTMLButtonAttributes } from 'svelte/elements'
import type { AutoDocsBaseProps } from './base'

export interface AutoDocsButtonProps extends AutoDocsBaseProps, HTMLButtonAttributes {
  /** The text on the button. */
  label: string
  /**
   * How large the button is.
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg'
  /** Shown before the label. */
  icon?: Snippet
  /** Called when the button is pressed. */
  onpress?: (event: MouseEvent) => void
  /** @internal */
  secret?: string
}
