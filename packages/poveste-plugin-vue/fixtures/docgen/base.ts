export interface BaseProps {
  /**
   * How much room the button takes.
   * @defaultValue 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * The old name for `tone`.
   * @deprecated use `tone`
   */
  variant?: string
  /** @internal */
  secret?: string
}
