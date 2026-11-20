import { setupDevtoolsPlugin } from '@vue/devtools-api'

function inspectorTree() {
  return 'a tree only the devtools callback reaches'
}

// As pinia, vue-router and vue-i18n register: a call whose result nothing reads.
export function register() {
  setupDevtoolsPlugin({ id: 'registration', label: 'Registration' }, (api) => {
    api.addInspector({ id: 'registration', label: inspectorTree() })
  })
}
