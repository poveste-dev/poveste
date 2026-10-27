import { defineStory } from '@poveste/plugin-solid'

export default defineStory<{ count: number }>({
  title: 'Passing',
  variants: [
    { title: 'plain', render: () => <p>plain</p> },
    { title: 'from initState', initState: async () => ({ count: 2 }), render: ({ state }) => <p>{state.count}</p> },
    {
      title: 'from the setup file',
      render: () => {
        if (!(globalThis as { setupRan?: boolean }).setupRan) {
          throw new Error('the setup file did not run')
        }
        return <p>set up</p>
      },
    },
  ],
})
