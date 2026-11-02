// Named, so the table's type cell opens it on hover (#1527).
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface BaseProps {
  /**
   * How much room the button takes.
   * @defaultValue 'md'
   */
  size?: ButtonSize
  /**
   * The old name for `tone`.
   * @deprecated use `tone`
   */
  variant?: string
  /** @internal */
  secret?: string
}
