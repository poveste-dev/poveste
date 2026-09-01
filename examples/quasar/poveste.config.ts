import { HstQuasar } from '@poveste/plugin-quasar'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig, getDefaultConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue(), HstQuasar()],
  setupFile: '/src/poveste.setup.ts',
  // Part of the conformance contract, and it lives in config rather than in a
  // story: `toolbar-background.spec.ts` asserts six presets, which is the
  // defaults plus this one. Every conformance book declares it identically
  // (#499).
  backgroundPresets: [
    ...(getDefaultConfig().backgroundPresets || []),
    {
      label: 'Custom gray',
      color: '#cafff5',
      contrastColor: '#005142',
    },
  ],
  defaultBackgroundColor: 'transparent',
})
