/** @jsxImportSource react */
import type { ReactNode } from 'react'

export function Notice({ children }: { children: ReactNode }) {
  return <p className="notice">{children}</p>
}
