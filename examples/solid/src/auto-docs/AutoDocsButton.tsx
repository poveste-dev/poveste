import type { JSX, ParentProps } from 'solid-js'
import { mergeProps } from 'solid-js'

export interface AutoDocsButtonProps extends ParentProps, JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The text on the button. */
  label: string
  /**
   * How large the button is.
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * How prominent the button is.
   * @default 3
   */
  level?: 1 | 2 | 3
  /** @deprecated use `tone` */
  variant?: 'solid' | 'outline'
  /** @internal */
  secret?: string
  /** Shown before the label. */
  icon?: JSX.Element
  /** Called when the button is pressed. */
  onPress?: (event: MouseEvent) => void
}

export function AutoDocsButton(props: AutoDocsButtonProps) {
  const merged = mergeProps({ size: 'md', level: 2 } as const, props)
  return (
    <button data-size={merged.size} data-level={merged.level} onClick={event => merged.onPress?.(event)}>
      {merged.icon}
      {merged.label}
    </button>
  )
}
