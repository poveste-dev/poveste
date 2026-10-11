import { defineStory } from '@poveste/plugin-react'
import { Counter } from './Counter'

export default defineStory<{ count: number, label: string }>({
  title: 'Counter',
  initState: () => ({ count: 0, label: 'Clicked' }),
  variants: [
    {
      id: 'default',
      title: 'From zero',
      render: ({ state, setState }) => (
        <Counter count={state.count} label={state.label} onIncrement={() => setState(current => ({ count: current.count + 1 }))} />
      ),
    },
    {
      id: 'ten',
      title: 'From ten',
      initState: () => ({ count: 10, label: 'Clicked' }),
      render: ({ state, setState }) => (
        <Counter count={state.count} label={state.label} onIncrement={() => setState(current => ({ count: current.count + 1 }))} />
      ),
    },
  ],
})
