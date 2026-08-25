<script setup>
function playAudio () {
  document.querySelector('#poveste-audio').play()
}
</script>

<audio id="poveste-audio">
  <source src="/poveste.m4a" type="audio/mp4">
</audio>

# Getting started with Poveste

## Overview

> **poveste** is the Romanian word for "story", pronounced `/poˈveste/` (_po-VES-teh_) <button class="btn p-1 leading-none" v-on:click="playAudio"><Icon icon="carbon:volume-up-filled" class="w-4 h-4 align-middle"/></button>. Coming from histoire? See the [migration guide](/guide/migration-from-histoire).

Poveste is a tool to generate stories applications (or "books").

[Learn more about Poveste here &raquo;](../index.md)

<DemoLinks framework="vue" />

## Installation

Install the `poveste` and `@poveste/plugin-vue` packages into your project:

```shell
pnpm i -D poveste @poveste/plugin-vue
# OR
npm i -D poveste @poveste/plugin-vue
# OR
yarn add -D poveste @poveste/plugin-vue
```

Create a `poveste.config.js` or `poveste.config.ts` file in your project root to enable the Vue plugin:

```ts
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstVue(),
  ],
})
```

## Command Line Interface

Poveste provides the following commands:
- `poveste dev`: starts a development server with hot-reload
- `poveste build`: builds the app for production
- `poveste preview`: starts an HTTP server that serves the built app

You can add these to your `package.json` like this:

```json
{
  "scripts": {
    "story:dev": "poveste dev",
    "story:build": "poveste build",
    "story:preview": "poveste preview"
  }
}
```

And then run them with `npm run story:dev` or `npm run story:build`.

You can specify additional CLI options like `--port`. For a full list of CLI options, run `npx poveste --help` in your project.

Running several books at once is fine: give each `poveste dev` a distinct `--port` and the servers stay fully isolated, hot-reload included.

## TypeScript

To enable the global components types in your project, create an `env.d.ts` file at the root of your project if it doesn't already exist.

```ts
/// <reference types="@poveste/plugin-vue/components" />
```

And add it in the `include` field of your `tsconfig.json`.

Example:

```json
{
  "compilerOptions": {
    "target": "es2017",
    "module": "esnext",
    "lib": ["esnext"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "strictNullChecks": true,
    "resolveJsonModule": true,
    "jsx": "preserve"
  },
  "include": [
    "env.d.ts",
    "src/**/*",
    "src/**/*.vue"
  ]
}
```

## Nuxt

<div class="demo-links-box border-emerald-200 dark:border-emerald-900">
  <img src="/nuxt.svg" alt="Nuxt logo" class="w-10 h-10 mt-3 object-contain" />
  <DemoLinks framework="nuxt" />
</div>

Poveste supports Nuxt with the `@poveste/plugin-nuxt` package.

::: info Supported versions
**Nuxt 4.5 is the supported floor** (`nuxt@^4.5.0`) — that is the first Nuxt whose
`@nuxt/vite-builder` runs on Vite 8, which Poveste requires. Nuxt 4.0–4.4 are on Vite 7
and are out of range for the same reason.

Nuxt 3 is gone from the peer range too: it was advertised but never covered by an example
or a CI job, and the 3.16/3.17 `jiti` breakage in `loadNuxt` was never something we could
reproduce or fix. `examples/nuxt4` is what CI actually proves.
:::

```bash
pnpm add -D @poveste/plugin-nuxt
```

Add the plugin in poveste config:

```js
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

### i18n

[`@nuxtjs/i18n`](https://i18n.nuxtjs.org) works in stories, with one deliberate seam.

Its runtime is a Nuxt client plugin that expects a full Nuxt app — router, request
context, the real `useNuxtApp()`. A story renders in a headless sandbox that has none of
that, so the plugin throws on boot and Nuxt paints a 500 into the story iframe. Poveste
therefore **skips `@nuxtjs/i18n`'s client plugins in the sandbox** — the module's build-time
parts (the `<i18n>` block compiler, the `useI18n` auto-import) stay, only the runtime plugin
that cannot run is dropped.

That leaves the story app without an i18n instance, so install one yourself in the
[setup file](./app-setup.md) — the same `app` your stories mount into:

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

## Configuration

Learn more about configuring Poveste [here](../config.md).

## Community

If you have questions or need help, reach out to the community on [GitHub Discussions](https://github.com/poveste-dev/poveste/discussions).
