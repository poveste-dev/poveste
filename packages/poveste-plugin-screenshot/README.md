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

## Where the screenshots go

By default the plugin writes one PNG per variant per responsive preset into `.poveste/screenshots`, inside your project:

```
.poveste/screenshots/<story-id>-<variant-id>-<width>x<height>.png
```

**Add that folder to your `.gitignore`.** It is build output, it is regenerated on every run, and one binary per variant adds up quickly — a book of any size will otherwise fill a commit the first time somebody runs `git add -A`.

```gitignore
.poveste/
```

Ignoring the whole `.poveste/` directory covers the built book as well. Set `saveFolder` if you would rather keep the screenshots somewhere else — a path you compare baselines from, for instance:

```js
HstScreenshot({
  saveFolder: 'tests/screenshots',
})
```

That folder is yours to decide about: baselines you intend to commit belong in tracked storage, and the default does not.

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
