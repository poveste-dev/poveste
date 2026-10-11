import { addCollection } from '@iconify/vue'
import { createPinia } from 'pinia'
import { generation } from 'virtual:$poveste-stories'
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
    // Which story list this page holds, so a page that missed its update is sent it (#1218).
    import.meta.hot.send('poveste:mount', { generation })

    // Not `#__PURE__`: the call is nothing but side effects, and that annotation
    // let the bundler drop it, so dev never had the plugin API here (#1064).
    setupPluginApi()
  }
}
