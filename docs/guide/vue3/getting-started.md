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

<DemoLinks framework="vue3" />

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

<DemoLinks framework="nuxt3" />

Poveste supports Nuxt with the `@poveste/plugin-nuxt` package.

::: info Supported versions
**Nuxt 4 is the supported floor** (`nuxt@^4.0.0`). Nuxt 3 is no longer in the peer range —
it was advertised but never covered by an example or a CI job, and the 3.16/3.17 `jiti`
breakage in `loadNuxt` was never something we could reproduce or fix.
`examples/nuxt4` is what CI actually proves.
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

## Configuration

Learn more about configuring Poveste [here](../config.md).

## Community

If you have questions or need help, reach out to the community on [GitHub Discussions](https://github.com/poveste-dev/poveste/discussions).
