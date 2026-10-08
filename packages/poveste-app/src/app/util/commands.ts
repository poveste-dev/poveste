import type { ClientCommand, ClientCommandContext, Story } from '@poveste/shared'
import { router } from '../router.js'
import { useStoryStore } from '../stores/story.js'
import { openInEditor } from './open-in-editor.js'

/**
 * The path "Open file in editor" should open, or undefined when there is none.
 *
 * `Story.file` is optional, and `let file: string` used to be assigned
 * `story.file?.filePath` in both branches — so a story without a file produced
 * `file: undefined`, and `openInEditor` sent
 * `__open-in-editor?file=undefined` to the dev server: a request to open a file
 * literally named "undefined", with nothing said in the UI (#667).
 *
 * A docs-only story prefers its markdown, falling back to the component file
 * when the story has both.
 */
function editableFilePath(story: Story | undefined): string | undefined {
  const file = story?.file
  if (!file) return undefined
  return story?.docsOnly ? file.docsFilePath ?? file.filePath : file.filePath
}

export const builtinCommands: ClientCommand[] = [
  {
    id: 'builtin:open-in-editor',
    label: 'Open file in editor',
    icon: 'carbon:script-reference',
    // On the path rather than on the story: a story with no file has nothing
    // to open, and offering the command was how the bad request got sent.
    showIf: ({ route }) => route.name === 'story' && !!editableFilePath(useStoryStore().currentStory),
    getParams: () => ({
      file: editableFilePath(useStoryStore().currentStory),
    }),
    clientAction: ({ file }) => {
      if (file) openInEditor(file)
    },
  },
  {
    id: 'builtin:poveste-docs',
    label: 'Open Poveste Documentation',
    icon: 'carbon:help',
    clientAction: () => {
      window.open('https://poveste.dev/guide/getting-started', '_blank')
    },
  },
]

export async function executeCommand(command: ClientCommand, params: Record<string, any>) {
  const hot = import.meta.hot
  if (!hot) return

  // The client half waits for the server's: a generated story was opened before its
  // file existed, and opened anyway when writing it failed (#1176).
  const result = await new Promise<{ id: string, error?: string }>((resolve) => {
    const listener = (data: { id: string, error?: string }) => {
      if (data.id !== command.id) return
      hot.off('poveste:dev-command-result', listener)
      resolve(data)
    }
    hot.on('poveste:dev-command-result', listener)
    hot.send('poveste:dev-command', { id: command.id, params })
  })

  if (result.error) {
    console.error(`[poveste] ${command.label}: ${result.error}`)
    return
  }
  command.clientAction?.(params, getCommandContext())
}

export function getCommandContext(): ClientCommandContext {
  const storyStore = useStoryStore()
  return {
    route: router.currentRoute.value,
    currentStory: storyStore.currentStory,
    currentVariant: storyStore.currentVariant,
  }
}
