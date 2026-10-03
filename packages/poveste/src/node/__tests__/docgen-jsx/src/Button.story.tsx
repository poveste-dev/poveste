import { Button } from './Button'

function defineStory<T>(story: T) {
  return story
}

export default defineStory({
  title: 'Button',
  component: Button,
  variants: [{ id: 'default', title: 'default', render: () => <Button label="Go" /> }],
})
