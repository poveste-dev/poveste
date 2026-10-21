# Poveste + Nuxt 4

Requires `nuxt@^4.5.0` — the first Nuxt whose `@nuxt/vite-builder` runs on Vite 8.

```bash
pnpm add -D poveste @poveste/plugin-vue @poveste/plugin-nuxt
```

Add the plugin in poveste config:

```js
import { HstNuxt } from '@poveste/plugin-nuxt'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstNuxt(),
  ],
})
```

Your Vue components get a props, slots and events table on each story's **Docs** tab, through `@poveste/plugin-vue`. It needs `typescript` 6 or earlier in the project (`npm i -D typescript@6`), which npm doesn't install with Nuxt; without it, or with 7, it turns itself off and says so once.

[Nuxt guide](https://poveste.dev/guide/nuxt/getting-started) ·
[Documentation](https://poveste.dev)
