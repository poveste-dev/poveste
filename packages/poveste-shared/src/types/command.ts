import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { Prompt } from './prompt.js'
import type { Story, Variant } from './story.js'

export interface CommonCommandOptions {
  icon?: string
  searchText?: string
  prompts?: Prompt[]
}

export interface Command extends CommonCommandOptions {
  id: string
  label: string
}

export interface ClientCommandOptions extends CommonCommandOptions {
  showIf?: (ctx: ClientCommandContext) => boolean
  getParams?: (ctx: ClientCommandContext & { answers?: Record<string, any> }) => Record<string, any>
  clientAction?: (params: Record<string, any>, ctx: ClientCommandContext) => unknown
}

/**
 * A command that can be executed from the search bar.
 */
export type ClientCommand = Command & ClientCommandOptions

export interface ClientCommandContext {
  route: RouteLocationNormalizedLoaded
  /**
   * The story the route names, or undefined on any route that names none — the
   * home page, or a story id that is not loaded. Declared non-optional here
   * until #667: the app has always filled it from a `.find()`, so a plugin
   * writing `ctx.currentStory.id` in `showIf` was reading a value the type
   * promised and the app did not always supply.
   */
  currentStory: Story | undefined
  /** The selected variant, or undefined. Null in the tick between a story being routed to and its variant being chosen. */
  currentVariant: Variant | undefined
}

export interface PluginCommand<
  TParams = Record<string, any>,
> extends Command {
  serverAction?: (params: TParams) => unknown // @TODO ctx
  clientSetupFile?: string | { file: string, importName: string }
}
