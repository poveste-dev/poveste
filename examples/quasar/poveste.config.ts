import { HstQuasar } from '@poveste/plugin-quasar'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue(), HstQuasar()],
  setupFile: '/src/poveste.setup.ts',
  /*
   * Conformance configuration, deliberately not part of the published recipe.
   *
   * `toolbar-background.spec.ts` counts six presets, and every conformance book
   * declares the same set (#540). This file is also the Quasar recipe
   * `docs/guide/config.md` publishes, so the block must not be on that page —
   * handing a reader a `Custom gray` fixture as setup guidance would be shipping
   * a test fixture as documentation.
   *
   * Spelled out rather than spread from `getDefaultConfig()`, which the other
   * books use: importing it would change the recipe's own import line, and that
   * line *is* published. The spec hardcodes the same six, so a change to the
   * defaults already has to be made in both places.
   */
  backgroundPresets: [
    { label: 'Transparent', color: 'transparent', contrastColor: '#333' },
    { label: 'White', color: '#fff', contrastColor: '#333' },
    { label: 'Light gray', color: '#aaa', contrastColor: '#000' },
    { label: 'Dark gray', color: '#333', contrastColor: '#fff' },
    { label: 'Black', color: '#000', contrastColor: '#eee' },
    { label: 'Custom gray', color: '#cafff5', contrastColor: '#005142' },
  ],
  defaultBackgroundColor: 'transparent',
})
