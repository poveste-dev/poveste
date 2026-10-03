import type { ClientCommandOptions } from 'poveste'
import { kebabCase } from 'change-case'
import { openStory, sendEvent } from 'poveste/plugin'

export default {
  prompts: [
    {
      field: 'component',
      label: 'Choose a component',
      type: 'select',
      options: async search => sendEvent('listVueComponents', { search }),
      required: true,
    },
    {
      field: 'fileName',
      label: 'File name',
      type: 'text',
      required: true,
      // A name, not a path: both halves join it to the component's own directory,
      // and a path here was joined twice into one that does not exist (#1176).
      defaultValue: answers => answers['component']?.split('/').pop()?.replace(/\.vue$/, '.story.vue'),
    },
  ],
  clientAction: (params) => {
    const index = params['component'].lastIndexOf('/')
    const dirname = params['component'].substring(0, index + 1)
    const file = `${dirname}${params['fileName']}`
    const storyId = kebabCase(file.toLowerCase())
    openStory(storyId)
  },
} as ClientCommandOptions
