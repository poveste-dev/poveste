---
title: 'Getting started with Nuxt — install the plugin and write a story'
description: 'Install Poveste and the Nuxt plugin, add the config, and write your first story. Nuxt 4.5 is the supported floor.'
---

# Getting started with Nuxt

<div class="demo-links-box border-emerald-200 dark:border-emerald-900">
  <img src="/nuxt.svg" alt="Nuxt logo" class="w-10 h-10 mt-3 object-contain" />
  <DemoLinks framework="nuxt" />
</div>

## Installation

Nuxt needs three packages: Poveste, the Vue plugin it builds on, and the Nuxt plugin itself.

```shell
pnpm i -D poveste @poveste/plugin-vue @poveste/plugin-nuxt
# OR
npm i -D poveste @poveste/plugin-vue @poveste/plugin-nuxt
# OR
yarn add -D poveste @poveste/plugin-vue @poveste/plugin-nuxt
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

::: warning On Node 22, use npm 11.6 or later
npm 10, the npm Node 22.22.2 ships with, stops with `Cannot read properties of null (reading 'edgesOut')` while resolving Nuxt's dependencies ([npm/cli#9787](https://github.com/npm/cli/issues/9787), fixed in npm 11.6). It fails on `npm i nuxt` alone, so it is not Poveste's install that triggers it. Update npm first with `npm install -g npm@11.6.0`, or use pnpm.
:::

::: info Supported versions
**Nuxt 4.5 is the supported floor** (`nuxt@^4.5.0`) — that is the first Nuxt whose
`@nuxt/vite-builder` runs on Vite 8, which Poveste requires. Nuxt 4.0–4.4 are on Vite 7
and are out of range for the same reason.

Nuxt 3 is gone from the peer range too: it was advertised but never covered by an example
or a CI job, and the 3.16/3.17 `jiti` breakage in `loadNuxt` was never something we could
reproduce or fix. `examples/nuxt` is what CI actually proves.
:::

Create a `poveste.config.js` or `poveste.config.ts` file in your project root, and register both plugins — `HstNuxt()` extends `HstVue()` rather than replacing it:

```ts
import { HstNuxt } from '@poveste/plugin-nuxt'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstVue(),
    HstNuxt(),
  ],
})
```

## No Vite config is needed

The [Vue guide](../vue/getting-started.md#the-vite-config) tells a plain Vue project to create a `vite.config.ts` with `@vitejs/plugin-vue`. **Nuxt does not need one.** Its own builder supplies the Vue plugin, and `@poveste/plugin-nuxt` reads Nuxt's resolved Vite config and curates it for the story sandbox.

`examples/nuxt` carries no `vite.config.ts` at all, and it is the book CI builds on every pull request.

## Command Line Interface

Add the scripts to your `package.json`:

```json
{
  "scripts": {
    "story:dev": "poveste dev",
    "story:build": "poveste build",
    "story:preview": "poveste preview"
  }
}
```

## i18n

[`@nuxtjs/i18n`](https://i18n.nuxtjs.org) works in stories, with one deliberate seam.

Its runtime is a Nuxt client plugin that expects a full Nuxt app — router, request
context, the real `useNuxtApp()`. A story renders in a headless sandbox that has none of
that, so the plugin throws on boot and Nuxt paints a 500 into the story iframe. Poveste
therefore **skips `@nuxtjs/i18n`'s client plugins in the sandbox** — the module's build-time
parts (the `<i18n>` block compiler, the `useI18n` auto-import) stay, only the runtime plugin
that cannot run is dropped.

That leaves the story app without an i18n instance, so install one yourself in the
[setup file](../vue/app-setup.md) — the same `app` your stories mount into:

```ts
// poveste.setup.ts
import { defineSetupVue } from '@poveste/plugin-vue'
import { createI18n } from 'vue-i18n'

export const setupVue = defineSetupVue(({ app }) => {
  app.use(createI18n({
    legacy: false,
    globalInjection: true,
    locale: 'en',
    messages: {
      en: { greeting: 'Hello' },
      fr: { greeting: 'Bonjour' },
    },
  }))
})
```

`useI18n()` and `$t` then resolve against this instance. Two things follow from it being a
plain vue-i18n install rather than the Nuxt module's:

- **Messages are the ones you pass here.** Stories do not load your app's locale files, so
  give the setup the messages your stories need. Keeping them in files is fine — JSON
  imports directly (`import en from './locales/en.json'`); YAML or JSON5 files go through
  `unplugin-vue-i18n`'s resource loading, which `@nuxtjs/i18n` already sets up.
- **Nuxt-specific helpers are not wired** (`useLocalePath`, `useSwitchLocalePath`,
  localized routing). Stories showcase components, not routes, so this is rarely a limit;
  when a component needs one, stub it in the setup.

## Incompatible client plugins

`@nuxtjs/i18n` is one case of a general problem: a Nuxt module can register a **client
plugin that assumes a full Nuxt runtime** — the real `useNuxtApp()`, a router, request
context — which the headless story sandbox does not provide. Such a plugin throws while it
sets up. Poveste handles this in two layers.

**Failing plugins are skipped, not fatal.** If a client plugin throws while setting up in
the sandbox, Poveste catches it, logs a `[poveste] … skipping it` warning naming the
plugin, or the file it came from when the plugin has no name, and renders the story anyway — one broken plugin no longer paints a 500 into every
iframe. Whatever that plugin would have provided is simply absent. So a module Poveste has
never seen degrades gracefully instead of taking the story down.

**Drop a plugin outright with `excludePlugins`.** For a plugin that must not run at all —
it fails at *import* time (before setup, which the tolerant boot above cannot catch), or it
has side effects you want gone — list it and Poveste removes it before boot:

```js
import { HstNuxt } from '@poveste/plugin-nuxt'

export default defineConfig({
  plugins: [
    HstVue(),
    HstNuxt({
      // Substring or RegExp, matched against each plugin's resolved path.
      excludePlugins: [/[\\/]my-module[\\/].*[\\/]plugins[\\/]/, 'analytics.client'],
    }),
  ],
})
```

Your patterns are added **on top of** the built-in defaults (which already drop
`@nuxtjs/i18n`'s client plugins), not in place of them.

## Where story files go

Anywhere in the project: Poveste finds every `*.story.vue` under the project root, so a story can sit beside its component in `app/components/` or in a folder of its own, such as `stories/`.

Beside the component is the usual place, with one thing to know. Nuxt registers every `.vue` file under `app/components/` as a component, story files included: `BaseButton.story.vue` becomes an auto-importable `<BaseButtonStory>`. Nothing breaks, because Nuxt only bundles the components a page uses. To keep stories out of that list, tell Nuxt to skip them:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  components: [
    { path: '~/components', ignore: ['**/*.story.vue'] },
  ],
})
```

Poveste still finds them, because it looks for story files itself and does not go through Nuxt's component scan. A folder outside `app/`, like `stories/` at the project root, is never scanned by Nuxt and needs no setting.

## Component docs

A story's **Docs** tab shows a props, slots and events table for each `.vue` component the story imports, read from the component's types: see [Props, slots and events](../vue/docs.md#props-slots-and-events). It reads them with TypeScript, which the book needs installed at version 6 or earlier: `npm i -D typescript@6`. A Nuxt project installed with npm doesn't have it. Without it, or with TypeScript 7, auto-docs turns itself off and says so once in the terminal.

## Write your first story

Poveste has nothing to show until a story file exists, and `poveste build` on a book without one says so rather than failing.

**[Writing Vue stories](../vue/stories.md)** is the page that shows one.

## Community

If you have questions or need help, reach out to the community on [GitHub Discussions](https://github.com/poveste-dev/poveste/discussions/new?category=q-a).
