import { addCollection } from '@iconify/vue'
import FloatingVue from 'floating-vue'
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
  app.use(FloatingVue, {
    // Anchor poppers inside the chrome scope so the @scope-wrapped chrome CSS
    // reaches them. The default <body> teleport target is outside the scope.
    container: '.poveste-app-root',
    overflowPadding: 4,
    arrowPadding: 8,
    themes: {
      tooltip: {
        distance: 8,
      },
      dropdown: {
        computeTransformOrigin: true,
        distance: 8,
      },
    },
  })
  app.use(router)
  app.mount('#app')

  if (import.meta.hot) {
    import.meta.hot.send('poveste:mount', {})

    /* #__PURE__ */ setupPluginApi()
  }
}
