import { Legacy } from './Wrapped'

function defineStory<T>(story: T) {
  return story
}

export default defineStory({
  title: 'Legacy',
  component: Legacy,
  variants: [],
})
