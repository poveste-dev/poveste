# Poveste Screenshot visual regression testing

```bash
pnpm add -D @poveste/plugin-screenshot
```

Add the plugin in your Poveste config:

```js
import { HstScreenshot } from '@poveste/plugin-screenshot'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstScreenshot({
      // Options here
    }),
  ],
})
```

## Setting Up Chrome Linux Sandbox

If you get `No usable sandbox!` or `Running as root without --no-sandbox is not
supported`, set up sandboxing properly on your Linux instance. Alternatively, if you
completely trust the content being captured, you can disable it (strongly discouraged):

```js
import { HstScreenshot } from '@poveste/plugin-screenshot'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstScreenshot({
      launchOptionsArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
    }),
  ],
})
```

[Documentation](https://poveste.dev)
