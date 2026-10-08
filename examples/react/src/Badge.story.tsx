import { defineStory } from '@poveste/plugin-react'
import { Badge } from './Badge'

export default defineStory({
  title: 'Badge',
  variants: [
    { id: 'info', title: 'Info', render: () => <Badge tone="info">Information</Badge> },
    { id: 'warn', title: 'Warning', render: () => <Badge tone="warn">Careful</Badge> },
  ],
})
