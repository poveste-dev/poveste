type Size = 's' | 'm' | 'l'
export const icons = ['like', 'loader'] as const
type IconName = (typeof icons)[number]
enum Tone { Info = 'info', Warn = 'warn' }

export interface Props {
  label: string
  count: number
  open: boolean
  size: Size
  inline?: 'a' | 'b'
  icon?: IconName
  tone: Tone
  level: 1 | 2 | 3
  maybe: 'x' | null
  width: `${number}px`
  items: string[]
  pair: [number, number]
  options: { dense: boolean }
  mixed: string | HTMLElement
  sizeOrFlag: Size | boolean
  onClick: () => void
  when: Date
  anything: unknown
}
