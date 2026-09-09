---
title: 'Getting started with Vue — install the plugin and write a story'
description: 'Install Poveste and the Vue plugin, add the config, and write your first story.'
---

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

### The Vite config

Poveste builds through your project's own Vite config rather than one of its own, so a Vue project also needs [`@vitejs/plugin-vue`](https://www.npmjs.com/package/@vitejs/plugin-vue). That is a different package from `@poveste/plugin-vue`, doing a different job: one teaches Vite to compile `.vue` files, the other teaches Poveste to collect and render stories. Installing the second does not bring the first.

If you are adding Poveste to an existing Vue app you already have this, and there is nothing to do here. Starting from an empty project, without it the first build fails on the first component it reads:

```
Failed to parse source for import analysis…
Install @vitejs/plugin-vue to handle .vue files.
```

```shell
pnpm i -D vite @vitejs/plugin-vue
# OR
npm i -D vite @vitejs/plugin-vue
# OR
yarn add -D vite @vitejs/plugin-vue
```

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
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

Poveste supports Nuxt with the `@poveste/plugin-nuxt` package, which sits on top of
`@poveste/plugin-vue` rather than replacing it — a Nuxt project installs three packages and
registers both plugins.

**Nuxt 4.5 is the supported floor** (`nuxt@^4.5.0`): the first Nuxt whose
`@nuxt/vite-builder` runs on Vite 8, which Poveste requires. Nuxt 4.0–4.4 are on Vite 7 and
out of range for the same reason, and Nuxt 3 is out of the peer range because no example or
CI job ever covered it.

Unlike a plain Vue project, **Nuxt needs no `vite.config.ts`** — its own builder supplies the
Vue plugin, and `@poveste/plugin-nuxt` reads Nuxt's resolved Vite config and curates it for
the story sandbox.

The full setup, the i18n notes and the incompatible-client-plugins guidance now live on their
own page: **[Getting started with Nuxt](../nuxt/getting-started.md)**.

---
## Configuration

Learn more about configuring Poveste [here](../config.md).

## Community

If you have questions or need help, reach out to the community on [GitHub Discussions](https://github.com/poveste-dev/poveste/discussions).
