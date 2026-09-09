---
title: 'Visual regression testing with Percy'
description: 'Capture a screenshot of every story and diff them between runs using Percy.'
---

# Poveste Screenshot with Percy for visual regression testing

You need the [Percy CLI](https://docs.percy.io/docs/cli-overview) installed to be able to send snapshots to Percy.

```bash
pnpm add -D @poveste/plugin-percy
```

Add the plugin in poveste config:

```js
import { HstPercy } from '@poveste/plugin-percy'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstPercy({
      // Options here
    }),
  ],
})
```

Then use the Percy CLI

```bash
# Replace `story:build` with the script to build the stories if you changed it
percy exec pnpm run story:build
```
