# Poveste + Nuxt 4

Requires `nuxt@^4.0.0`.

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
