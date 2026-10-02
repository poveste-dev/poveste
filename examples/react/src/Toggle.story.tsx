import { defineStory } from '@poveste/plugin-react'
import { useState } from 'react'

// `render` is a component body, so a hook in it keeps its state across renders
// like any other component's, including one the panel causes.
export default defineStory<{ label: string }>({
  title: 'Toggle',
  initState: () => ({ label: 'Power' }),
  render: ({ state }) => {
    const [on, setOn] = useState(false)
    return (
      <button type="button" aria-pressed={on} onClick={() => setOn(value => !value)}>
        {`${state.label}: ${on ? 'On' : 'Off'}`}
      </button>
    )
  },
})
