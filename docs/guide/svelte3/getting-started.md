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

<DemoLinks framework="svelte" />

## Installation

Install the `poveste` and `@poveste/plugin-svelte` packages into your project:

```shell
pnpm i -D poveste @poveste/plugin-svelte
# OR
npm i -D poveste @poveste/plugin-svelte
# OR
yarn add -D poveste @poveste/plugin-svelte
```

Create a `poveste.config.js` or `poveste.config.ts` file in your project root to enable the Svelte plugin:

```ts
import { HstSvelte } from '@poveste/plugin-svelte'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstSvelte(),
  ],
})
```

::: info Supported versions
**Svelte 5 is the supported floor** (`svelte@^5.0.0`). Svelte 4 is not in the peer range:
its last compatible `@sveltejs/vite-plugin-svelte` is v3, which caps at Vite 5, and Poveste
requires Vite 8. No release pairs the two.
:::

## TypeScript stories

If you write stories with `<script lang="ts">`, your `tsconfig.json` **must** set
`verbatimModuleSyntax`:

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

Without it, `svelte-preprocess` strips imports it cannot see used — and a component
referenced only from the markup looks exactly like an unused import. The story then fails
to collect:

```
Error while collecting story src/BaseButton.story.svelte:
ReferenceError: BaseButton is not defined
```

`svelte-preprocess` warns about this at startup (`The TypeScript option
verbatimModuleSyntax is now required when using Svelte files with lang="ts"`), but the
warning is easy to miss in the middle of a collection run.

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

## SvelteKit

Poveste supports SvelteKit through the same `@poveste/plugin-svelte` package — there is no
separate SvelteKit plugin to install.

::: info Supported versions
Unlike Vue, Nuxt and Svelte, **no SvelteKit range is declared in `peerDependencies`** —
`@poveste/plugin-svelte` peers only `svelte@^5.0.0`. What we can vouch for is what CI runs:
`examples/sveltekit` pins `@sveltejs/kit@^2.55.0` and `@sveltejs/vite-plugin-svelte@^7`.

The technical floor is lower. SvelteKit `2.53.0` is the first release to peer Vite 8 and
`@sveltejs/vite-plugin-svelte@^7` — and v7 is in turn the first plugin major to peer Vite 8,
which Poveste requires. So 2.53+ should work; 2.55+ is what is actually tested.

That example is the most thoroughly checked one we have: build, Playwright, and
`svelte-check` on every pull request.
:::

A standalone `poveste.config.ts` works exactly as it does above — Poveste reads it and the
`poveste` key of your Vite config and merges the two. Since SvelteKit already owns
`vite.config.ts`, keeping everything in one file is usually the tidier option, and it is what
`examples/sveltekit` does:

```ts
/// <reference types="poveste" />

import { HstSvelte } from '@poveste/plugin-svelte'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    sveltekit(),
  ],
  poveste: {
    plugins: [
      HstSvelte(),
    ],
    setupFile: './src/poveste.setup.ts',
  },
})
```

Importing `@poveste/plugin-svelte` is already enough to type the `poveste` key — poveste
augments Vite's config type, and importing any poveste package pulls that augmentation into
your program. The `/// <reference types="poveste" />` line makes it explicit, and is what you
need in a config that sets the `poveste` key without importing a poveste package.

If TypeScript does report the key as unknown, that reference is the fix. Do not reach for
`as any` on the config object: Vite genuinely checks it for unknown keys, so a cast throws
away that checking for everything inside — including the Poveste options you came for.

Nothing else needs changing. `svelte.config.js` and your adapter stay as they are, and
`@poveste/plugin-svelte` already excludes SvelteKit's compile plugin from the stories build,
so you do not need to configure `viteIgnorePlugins` yourself.

## Configuration

Learn more about configuring Poveste [here](../config.md).

## Community

If you have questions or need help, reach out to the community on [GitHub Discussions](https://github.com/poveste-dev/poveste/discussions).
