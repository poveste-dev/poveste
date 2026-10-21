import { Field } from './Wrapped'

function defineStory<T>(story: T) {
  return story
}

export default defineStory({
  title: 'Field',
  component: Field,
  variants: [],
})
