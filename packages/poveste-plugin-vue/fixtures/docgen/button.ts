import type { ButtonHTMLAttributes } from 'vue'
import type { BaseProps } from './base'

export interface ButtonProps extends BaseProps, Pick<ButtonHTMLAttributes, 'disabled'> {
  /** The text on the button. */
  label: string
  /**
   * Heading level for the label.
   * @default 3
   */
  level?: number
}
