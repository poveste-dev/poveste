---
title: 'Plugin API — hooks for building a Poveste plugin'
description: 'The hooks a Poveste plugin implements to collect stories and render them for a framework. Work in progress, so the shape may still change.'
---

# Plugin API

::: warning
This doc and the Plugin API are work-in-progress. Expect changes.
:::

## `api.watch`

Watches files for a plugin, and closes the watcher itself.

```ts
import type { Plugin } from 'poveste'

export function myPlugin(cssFile: string): Plugin {
  return {
    name: 'my-plugin',
    async onDev(api) {
      api.watch(cssFile, async (event, path) => {
        api.log(`${path}: ${event}`)
      })
    },
  }
}
```

The callback receives `'add'`, `'change'` or `'unlink'` and the path, for anything that happens after the call. Files that already exist raise nothing.

Poveste closes the watcher when the dev server closes, however it closes, so there is nothing to put in `onCleanup`. The function `api.watch` returns stops watching sooner.

In a build, `api.watch` does nothing: a build never watches. A callback that throws or rejects is logged with the plugin's name rather than crashing the dev server.

## Deprecated members

Four members of the plugin API are deprecated in 0.15.0. They keep working for the rest of 0.x and become removable at 1.0, as the [deprecation policy](/guide/getting-started#deprecations) describes.

| Member | Use instead |
| --- | --- |
| `api.colors` | `import pc from 'picocolors'` |
| `api.path` | `import path from 'node:path'`, or `pathe` for forward slashes on Windows |
| `api.fs` | `import fs from 'node:fs'` or `node:fs/promises` |
| `api.watcher` | `api.watch`, above, which Poveste closes for you |
