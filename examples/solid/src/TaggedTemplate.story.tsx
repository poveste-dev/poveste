import { defineStory } from '@poveste/plugin-solid'
import html from 'solid-js/html'

// `solid-js/html` has no browser build of its own and imports `solid-js/web`, so
// this story is what keeps collection honest about every Solid entry, not only
// the three a list would name. The template is built at module level on purpose.
const greeting = html`<em data-testid="tagged">Rendered by solid-js/html</em>`

export default defineStory({
  title: 'Tagged template',
  variants: [{ id: 'default', title: 'default', render: () => greeting as unknown as Element }],
})
