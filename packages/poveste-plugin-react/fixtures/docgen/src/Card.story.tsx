import { Card } from './Wrapped'

function defineStory<T>(story: T) {
  return story
}

export default defineStory({
  title: 'Card',
  component: Card,
  variants: [],
})
