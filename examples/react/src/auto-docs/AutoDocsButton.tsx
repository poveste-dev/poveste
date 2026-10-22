import type { ButtonHTMLAttributes, MouseEvent, PropsWithChildren, ReactNode } from 'react'

export interface AutoDocsButtonProps extends PropsWithChildren, ButtonHTMLAttributes<HTMLButtonElement> {
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
  icon?: ReactNode
  /** Called when the button is pressed. */
  onPress?: (event: MouseEvent<HTMLButtonElement>) => void
}

export function AutoDocsButton({ label, size = 'md', level = 2, icon, onPress }: AutoDocsButtonProps) {
  return (
    <button data-size={size} data-level={level} onClick={event => onPress?.(event)}>
      {icon}
      {label}
    </button>
  )
}
