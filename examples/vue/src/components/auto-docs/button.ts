import type { BaseProps } from './base'

export interface ButtonProps extends BaseProps {
  /** The text on the button. */
  label: string
  /**
   * Heading level for the label.
   * @default 3
   */
  level?: number
}
