import type { ReactNode } from 'react'

export function Badge({ tone, children }: { tone: 'info' | 'warn', children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
