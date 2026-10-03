import { defineStory } from '@poveste/plugin-solid'
import { AutoDocsButton } from './AutoDocsButton'

// Auto-docs (#1110): the docs tab reads AutoDocsButton's props from the type of its first parameter.
export default defineStory({
  id: 'auto-docs-button',
  title: 'Auto-docs button',
  component: AutoDocsButton,
  variants: [{ id: 'default', title: 'default', render: () => <AutoDocsButton label="Press me" /> }],
})
