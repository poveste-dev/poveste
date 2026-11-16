import {
  addCustomCommand,
  addCustomTab,
  onDevToolsClientConnected,
  onDevToolsConnected,
  removeCustomCommand,
  setupDevtoolsPlugin,
  setupDevToolsPlugin,
} from '@vue/devtools-api'

export default {
  id: 'every-name',
  title: 'Every name',
  variants: [{
    title: 'Default',
    onMount: () => [
      addCustomCommand,
      addCustomTab,
      onDevToolsClientConnected,
      onDevToolsConnected,
      removeCustomCommand,
      setupDevtoolsPlugin,
      setupDevToolsPlugin,
    ],
  }],
}
