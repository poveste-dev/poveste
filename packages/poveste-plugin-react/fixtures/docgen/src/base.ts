import type { ReactNode } from 'react'

/** What every field in the fixture shares, imported as a design system's base props would be. */
export interface FieldBase {
  /** The field's label, read from an imported interface. */
  label: string
  /** Drawn after the label. */
  hint?: ReactNode
}
