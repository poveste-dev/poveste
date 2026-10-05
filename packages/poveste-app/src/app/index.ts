import { addCollection } from '@iconify/vue'
import { createPinia } from 'pinia'
import { generation } from 'virtual:$poveste-stories'
import { createApp, watch } from 'vue'
import App from './App.vue'
import { setupPluginApi } from './plugin.js'
import { router } from './router'
import { installRenderRootColorScheme } from './util/color-scheme.js'
import { isDark } from './util/dark.js'
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

  // The chrome's own scheme, for the browser: it paints the chrome's native
  // controls and scrollbars, and reads no class (#991). Here rather than in the
  // chrome stylesheet, which style isolation rewrites from `html` to the app root.
  watch(isDark, (dark) => {
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }, { immediate: true })
  installRenderRootColorScheme()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')

  if (import.meta.hot) {
    // Which story list this page holds, so a page that missed its update is sent it (#1218).
    import.meta.hot.send('poveste:mount', { generation })

    /* #__PURE__ */ setupPluginApi()
  }
}
