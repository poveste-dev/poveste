export interface BaseProps {
  /**
   * How prominent the button is.
   * @defaultValue 3
   */
  level?: 1 | 2 | 3
  /** @deprecated use `tone` */
  variant?: 'solid' | 'outline'
}
