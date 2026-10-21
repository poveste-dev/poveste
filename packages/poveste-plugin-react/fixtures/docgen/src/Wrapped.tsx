import type { FC } from 'react'
import { Component, forwardRef, memo } from 'react'

interface CardProps {
  /** The card's heading. */
  title: string
  /** @default false */
  raised?: boolean
}

/** Typed through `FC<P>`, whose call signature carries the props. */
export const Card: FC<CardProps> = ({ title, raised = false }) => <section data-raised={raised}>{title}</section>

interface FieldProps {
  /** The input's name. */
  name: string
}

/** Through `forwardRef`, whose result is called with the props. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(({ name }, ref) => <input ref={ref} name={name} />)

interface BadgeProps {
  /** How many. */
  count?: number
}

/** Through `memo`. */
export const Badge = memo(({ count = 0 }: BadgeProps) => <span>{count}</span>)

interface LegacyProps {
  /** Shown inside. */
  text: string
}

/** A class component, read from its construct signature. */
export class Legacy extends Component<LegacyProps> {
  render() {
    return <p>{this.props.text}</p>
  }
}
