import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

function HstQuasar() {
  return {
    name: 'quasar',
    async defaultConfig() {
      const { getTestingConfig } = await import('@quasar/app-vite/testing')
      const viteConfig = await getTestingConfig()
      return {
        vite: {
          // Quasar's own plugin defines `__QUASAR_VERSION__` while transforming
          // its source, so the source has to be transformed and not externalised.
          ssr: { noExternal: [/quasar/] },
          define: { ...viteConfig.define },
          resolve: {
            alias: viteConfig.resolve?.alias,
            extensions: viteConfig.resolve?.extensions,
            dedupe: viteConfig.resolve?.dedupe,
          },
          plugins: viteConfig.plugins,
        },
      }
    },
  }
}

export default defineConfig({
  plugins: [HstVue(), HstQuasar()],
  setupFile: '/src/poveste.setup.ts',
})
