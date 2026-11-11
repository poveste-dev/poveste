// In a file of its own, as a design system writes it, so the select comes through an alias.
export type BadgeSize = 'sm' | 'md' | 'lg'

export interface TypedBadgeProps {
  label: string
  size?: BadgeSize
  tone?: 'info' | 'warn'
  level?: number
  secret?: string
}
