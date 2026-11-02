import { defineStory } from '@poveste/plugin-react'
import { useEffect } from 'react'

function ThrowsInEffect() {
  useEffect(() => {
    throw new Error('an effect threw on purpose')
  }, [])
  return <p>effect</p>
}

export default defineStory({
  title: 'Failing',
  variants: [
    {
      title: 'throws in render',
      render: () => {
        throw new Error('render threw on purpose')
      },
    },
    { title: 'throws in an effect', render: () => <ThrowsInEffect /> },
    {
      title: 'warns',
      render: () => {
        console.warn('a warning on purpose')
        return <p>warned</p>
      },
    },
    // React's own development warning, printed with `console.error`.
    { title: 'leaves out a key', render: () => <ul>{['a', 'b'].map(item => <li>{item}</li>)}</ul> },
    {
      title: 'rejects in initState',
      initState: async () => {
        throw new Error('initState rejected on purpose')
      },
      render: () => <p>rejected</p>,
    },
    { title: 'fine', render: () => <p>fine</p> },
  ],
})
