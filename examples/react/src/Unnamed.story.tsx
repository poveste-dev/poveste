import { defineStory } from '@poveste/plugin-react'
import { memo } from 'react'

const Anonymous = memo(() => <b>anonymous</b>)

// Dynamic source can't print a component with no name, so the panel falls back to this file (#1569).
export default defineStory({
  title: 'Unnamed',
  variants: [
    { id: 'unnamed', title: 'Unnamed', render: () => <Anonymous /> },
    { id: 'named', title: 'Named', render: () => <b>named</b> },
  ],
})
