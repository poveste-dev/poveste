import { onDevToolsLaterHook, setupDevtoolsPlugin, sinceLaterVersion } from '@vue/devtools-api'

export default {
  id: 'installed-name',
  title: 'Installed name',
  variants: [{ title: 'Default', onMount: () => [onDevToolsLaterHook, setupDevtoolsPlugin, sinceLaterVersion] }],
}
