---
title: 'Getting started with Quasar — build a book inside a Quasar project'
description: 'Install Poveste in a Quasar project, register the plugin, and make your app boot files run in a story. Quasar 2.27 and @quasar/app-vite 3.8.'
---

# Getting started with Quasar

Quasar builds its Vite config asynchronously and hands it over through an entrypoint meant for tooling, so [`@poveste/plugin-quasar`](../plugins/official.md) does the fetching and makes the two adjustments a book needs.

## Installation

Three packages: Poveste itself, the Vue plugin every Vue-family book needs, and the Quasar one that sits on top of it.

```shell
pnpm i -D poveste @poveste/plugin-vue @poveste/plugin-quasar
# OR
npm i -D poveste @poveste/plugin-vue @poveste/plugin-quasar
# OR
yarn add -D poveste @poveste/plugin-vue @poveste/plugin-quasar
```

You need an existing Quasar project. The plugin reads the Vite config Quasar builds, so it looks for a `quasar.config` file above the current directory and fails with a message saying so if there is none.

## Configuration

```ts
// poveste.config.ts
import { HstQuasar } from '@poveste/plugin-quasar'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue(), HstQuasar()],
  setupFile: '/src/poveste.setup.ts',
})
```

Quasar also has to be installed into the story app, the same way it is installed into yours. The boot import below is an example of your own file — a fresh `npm init quasar` project has none, so start from `setupQuasar()` with no arguments and add yours once you have one:

```ts
// src/poveste.setup.ts
import { setupQuasar } from '@poveste/plugin-quasar/setup'
import { defineSetupVue3 } from '@poveste/plugin-vue'
import greeting from './boot/greeting' // one of your own, from src/boot

export const setupVue3 = defineSetupVue3(setupQuasar({
  // Your app's boot files. They do not run otherwise — see below.
  boot: [greeting],
}))
```

## Command Line Interface

Add the scripts to your `package.json`, alongside the ones Quasar already gave you:

```json
{
  "scripts": {
    "story:dev": "poveste dev",
    "story:build": "poveste build",
    "story:preview": "poveste preview"
  }
}
```

## Boot files do not run, and nothing tells you

Poveste renders your components in its own app, so Quasar's boot files — which run in *your* app's entry — never execute on their own. A component that reads something a boot file set finds it missing, and this fails quietly: the build succeeds, no error panel appears, the value is simply undefined.

App extensions are the same problem wearing a different hat. An extension registers its components through a boot file it contributes, so with none of them running, `<q-calendar-day>` and friends stay in the page as unresolved elements — again with no error.

That is what `setupQuasar({ boot })` is for. An extension's boot file comes from its package rather than your `src/boot`, so it is imported from there — for QCalendar, `@quasar/quasar-app-extension-qcalendar/dist/boot/vite-register.js` — and listed alongside your own.

Only `app` is passed to them: a story has no router, no store and no SSR context, so a boot file that needs those has to be split or guarded.

::: warning What this is checked against
Quasar 2.27 and `@quasar/app-vite` 3.8, on a project scaffolded by `npm init quasar` — layouts, router, `css/app.scss`, `quasar.variables.scss`, a boot file and an installed app extension.

Quasar's SPA mode only, which is all the entrypoint returns. Not checked: components that need the router or a store at mount time. If you hit something, please [open an issue](https://github.com/poveste-dev/poveste/issues).
:::

## What the plugin changes, and why you do not have to

Two adjustments, both of which exist so you do not have to make them.

`ssr.noExternal: [/quasar/]` is set for story collection. Quasar's own Vite plugin writes `__QUASAR_VERSION__` while transforming its source, so that source has to be transformed rather than externalised — otherwise the marker never lands. This is an implementation detail rather than something to copy into your own config, and [#365](https://github.com/poveste-dev/poveste/issues/365) may change it.

The config itself comes from an entrypoint whose own header says it is used exclusively by Quasar's testing app extensions. That is the same footing as Tailwind's `__unstable__loadDesignSystem`: usable, and not something to ask every reader to import from their own config. The plugin does it once so your config stays a normal Quasar config.
