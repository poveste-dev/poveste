# Poveste + Nuxt 4

Requires `nuxt@^4.5.0` — the first Nuxt whose `@nuxt/vite-builder` runs on Vite 8.

```bash
pnpm add -D @poveste/plugin-nuxt
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

[Nuxt guide](https://poveste.dev/guide/vue/getting-started.html#nuxt) ·
[Documentation](https://poveste.dev)
