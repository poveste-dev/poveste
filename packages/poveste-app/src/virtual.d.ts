declare module 'virtual:$poveste-commands' {
  import type { ClientCommand } from '@poveste/shared'

  export const registeredCommands: ClientCommand[]
}

declare module 'virtual:$poveste-support-plugins-client' {
  import type { Awaitable, Variant } from '@poveste/shared'
  import type { Component } from 'vue'

  export type GenerateSourceCode = (variant: Variant) => Awaitable<string | undefined | void>

  export const clientSupportPlugins: Record<string, () => Promise<{
    MountStory: Component
    RenderStory: Component
    generateSourceCode: GenerateSourceCode
  }>>
}

declare module 'virtual:*';
