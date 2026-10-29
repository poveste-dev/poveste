---
title: 'Getting started with Quasar — build a book inside a Quasar project'
description: 'Install Poveste in a Quasar project, register the plugin, and make your app boot files run in a story. Quasar 2.24+ and @quasar/app-vite 3.8+.'
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

::: tip Just installed and got an older version?
For about a day after a release, pnpm installs the **previous** version, with no error. Measured on 0.20.0's release day: pnpm 11.5.3 printed `+ poveste 0.19.1 (0.20.0 is available)`, and pnpm 12.14.0 printed nothing to say a newer one existed. That's pnpm's release-age cooldown, not a broken publish. A plugin that's new in that release is worse off: nothing comes before its `0.0.1` placeholder, which has no code, so pnpm installs that beside the previous `poveste`, and the only sign is a `deprecated` warning.

pnpm also saves the version it installed to `package.json` as `^x.y.z`, so waiting a day doesn't fix an install you've already run. Run the install line again with one of these:

- the `npm` line above;
- `--config.minimum-release-age=0` added to the `pnpm` line. Use the kebab-case spelling: pnpm 12.4.0 ignores `--config.minimumReleaseAge=0` without a word, though 12.14.0 accepts both;
- exact versions: `poveste@x.y.z` and the plugin at the same version. pnpm installs them, saves them without the `^`, and lists them under `minimumReleaseAgeExclude` in a `pnpm-workspace.yaml` it creates. `@latest` doesn't get you past the cooldown.
:::

::: warning Poveste needs Node `>=22.22.2`, and npm will not tell you
Run `node -v` before you install. On an older Node, `npm i poveste` still succeeds: npm installs the newest earlier Poveste that accepts your Node, and on a recent Node the only warning it prints names a dependency, not Poveste. These docs then describe a version you do not have, and the difference looks like a bug rather than its cause. With `engine-strict=true` in your `.npmrc`, npm refuses with `EBADENGINE` instead. pnpm installs the current version, and Poveste then refuses to start, naming the Node it needs; Yarn 1 refuses to install.

On Node 24, prefer 24.15 or later. Poveste's DOM dependency, jsdom, and three of its own dependencies declare `^22.22.2 || ^24.15.0 || >=26`. On 24.13.0 npm warns `EBADENGINE` for each of them and installs anyway, and a Vue book built there, but nothing tests Poveste on a Node 24 before 24.15.
:::

You need an existing Quasar project. The plugin reads the Vite config Quasar builds, so it looks for a `quasar.config` file above the current directory and fails with a message saying so if there is none.

The project also needs a Sass compiler, `sass` or `sass-embedded`, because Quasar's stylesheet is Sass. A project made with `npm init quasar` has one already; without one, Vite stops with `Preprocessor dependency "sass" not found`.

## Configuration

```ts twoslash
// poveste.config.ts
import { HstQuasar } from '@poveste/plugin-quasar'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue(), HstQuasar()],
})
```

Quasar also has to be installed into the story app, the same way it is installed into yours. With no `setupFile`, `HstQuasar()` installs it with Quasar's defaults, so a fresh `npm init quasar` project renders with the config above. Name a setup file once you need Quasar's options or your boot files, by adding `setupFile: '/src/poveste.setup.ts'` to that config: installing Quasar is then that file's job, and `setupQuasar()` does it. The boot import below is an example of your own file:

```ts
// src/poveste.setup.ts
import { setupQuasar } from '@poveste/plugin-quasar/setup'
import { defineSetupVue } from '@poveste/plugin-vue'
import greeting from './boot/greeting' // one of your own, from src/boot

export const setupVue = defineSetupVue(setupQuasar({
  // Your app's boot files. They do not run otherwise — see below.
  boot: [greeting],
}))
```

## Your own setup file

A setup file you need for something else still has to install Quasar, because naming one replaces the default. `setupQuasar()` with no options installs it as the default does, and returns a function you can call from your own setup:

```ts twoslash
// src/poveste.setup.ts
import { setupQuasar } from '@poveste/plugin-quasar/setup'
import { defineSetupVue } from '@poveste/plugin-vue'

const installQuasar = setupQuasar()

export const setupVue = defineSetupVue(({ app }) => {
  installQuasar({ app })
  // The rest of your setup, for example app.use(createPinia())
})
```

`setupQuasar()` takes two options: `boot`, above, and `quasar`, which is passed to `app.use(Quasar, …)` as Quasar's own plugin options.

A setup file that does not install Quasar shows on the story, not in the terminal. A story with a Quasar component, `q-btn` for one, shows **This component threw while rendering** and `Cannot read properties of undefined (reading 'platform')`, in a built book and under `poveste dev`. Under `poveste dev` the browser console warns `injection "_q_" not found` first. Neither `poveste dev` nor `poveste build` prints anything about it.

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

## Boot files do not run, and the page does not say so

Poveste renders your components in its own app, so Quasar's boot files — which run in *your* app's entry — never execute on their own. A component that reads something a boot file set finds it missing: the value is simply undefined.

App extensions are the same problem wearing a different hat. An extension registers its components through a boot file it contributes, so with none of them running, `<q-calendar-day>` and friends stay in the page as unresolved elements.

Both fail quietly on the page: the build succeeds and no error panel appears. The browser console is where they show, and only under `poveste dev`, where Vue warns `Failed to resolve component: q-calendar-day`, or, for a global a template reads, `Property "$greeting" was accessed during render but is not defined on instance`. A built book logs nothing.

That is what `setupQuasar({ boot })` is for. An extension's boot file comes from its package rather than your `src/boot`, so it is imported from there — for QCalendar, `@quasar/quasar-app-extension-qcalendar/dist/boot/vite-register.js` — and listed alongside your own. The extension itself is installed with `quasar ext add @quasar/qcalendar`, the short name.

Only `app` is passed to them: a story has no router, no store and no SSR context, so a boot file that needs those has to be split or guarded.

Write a boot file you hand to `setupQuasar()` as a plain function, `export default ({ app }) => { … }`, without Quasar's `defineBoot` from `#q-app/wrappers`. A setup file that imports such a boot file fails to load: the terminal says `Error while loading the setup file …` with `"./wrappers" is not exported`, and the browser shows an empty book.

::: warning What this is checked against
**What it requires:** `quasar` `^2.24.0` and `@quasar/app-vite` `^3.8.0`, the ranges `@poveste/plugin-quasar` declares. CI builds the Quasar example with the versions its lockfile pins, which are above both floors; the floors themselves are not tested.

**What was walked by hand:** Quasar 2.27 and `@quasar/app-vite` 3.8, on a project scaffolded by `npm init quasar` — layouts, router, `css/app.scss`, `quasar.variables.scss`, a boot file and an installed app extension.

Walked again since: on Poveste 0.16.2, both cases end to end, QCalendar included; and on Poveste 0.19.1 with Quasar 2.35.1 and `@quasar/app-vite` 3.10.3, a plain boot file with and without `setupQuasar({ boot })`, under `poveste dev` and in a built book.

Quasar's SPA mode only, which is all the entrypoint returns. Not checked: components that need the router or a store at mount time. If you hit something, please [open an issue](https://github.com/poveste-dev/poveste/issues).
:::

## What the plugin changes, and why you do not have to

Two adjustments, both of which exist so you do not have to make them.

`ssr.noExternal: [/quasar/]` is set for story collection. Quasar's own Vite plugin writes `__QUASAR_VERSION__` while transforming its source, so that source has to be transformed rather than externalised — otherwise the marker never lands. This is an implementation detail rather than something to copy into your own config, and [#365](https://github.com/poveste-dev/poveste/issues/365) may change it.

The config itself comes from an entrypoint whose own header says it is used exclusively by Quasar's testing app extensions. That is the same footing as Tailwind's `__unstable__loadDesignSystem`: usable, and not something to ask every reader to import from their own config. The plugin does it once so your config stays a normal Quasar config.

## Component docs

A story's **Docs** tab shows a props, slots and events table for each `.vue` component the story imports, read from the component's types: see [Props, slots and events](../vue/docs.md#props-slots-and-events). It reads them with TypeScript, which the book needs installed at version 6 or earlier: `npm i -D typescript@6`. A Quasar project installed with npm doesn't have it. Without it, or with TypeScript 7, auto-docs turns itself off and says so once in the terminal.

## Write your first story

Poveste has nothing to show until a story file exists, and `poveste build` on a book without one says so rather than failing.

**[Writing Vue stories](../vue/stories.md)** is the page that shows one. If a Quasar component, or an app extension's, does not show up in a story, [Quasar components in a story](../quasar-components-in-a-story.md) explains why.

## Community

If you have questions or need help, reach out to the community on [GitHub Discussions](https://github.com/poveste-dev/poveste/discussions/new?category=q-a).
