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

// The minified build, which the package ships without typing: a book is not
// minified, and axe-core's own entry weighs 1.4 MB in one against 0.55 (#162).
declare module 'axe-core/axe.min.js' {
  import axe from 'axe-core'

  export default axe
}
