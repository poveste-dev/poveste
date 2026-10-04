import { addCollection } from '@iconify/vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { setupPluginApi } from './plugin.js'
import { router } from './router'
import { iconCollections } from './util/icons.generated.js'
import 'virtual:$poveste-theme'

export async function mountMainApp() {
  // The chrome's icon data ships with the app. Without this every Icon fetched
  // its data from api.iconify.design at runtime — a handful of CDN requests per
  // boot, and no toolbar offline (#219). Story icons a user sets still resolve
  // through the runtime lookup.
  for (const collection of iconCollections) {
    addCollection(collection)
  }

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')

  if (import.meta.hot) {
    import.meta.hot.send('poveste:mount', {})

    /* #__PURE__ */ setupPluginApi()
  }
}
