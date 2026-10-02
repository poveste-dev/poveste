declare module 'virtual:$poveste-commands' {
  import type { ClientCommand } from '@poveste/shared'

  export const registeredCommands: ClientCommand[]
}

declare module 'virtual:$poveste-support-plugins-client' {
  import type { ClientSupportPlugin } from '@poveste/shared'
  import type { Component } from 'vue'

  export const clientSupportPlugins: Record<string, () => Promise<ClientSupportPlugin<Component>>>
}

declare module 'virtual:*';
