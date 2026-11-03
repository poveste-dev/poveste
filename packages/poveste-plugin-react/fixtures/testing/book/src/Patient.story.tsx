import { defineStory } from '@poveste/plugin-react'

export default defineStory<{ count: number }>({
  title: 'Patient',
  variants: [
    {
      title: 'slow',
      initState: async () => {
        await new Promise(resolve => setTimeout(resolve, 300))
        return { count: 1 }
      },
      render: ({ state }) => <p>{state.count}</p>,
    },
  ],
})
