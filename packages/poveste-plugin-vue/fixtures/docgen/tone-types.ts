import type { VNode } from 'vue'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface Item {
  id: string
  label?: string
}

export enum Level {
  Low = 'low',
  High = 'high',
}

export interface ToneProps {
  size: ButtonSize
  item: Item
  level?: Level
  fallback?: ToneProps['size'] | null
  label: string
  icon?: VNode
}
