---
title: 'Getting started with Svelte — install the plugin and write a story'
description: 'Install Poveste and the Svelte plugin, add the config, and write your first story.'
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
**`svelte@^5.46.4` is the supported floor**, alongside `@sveltejs/vite-plugin-svelte@^7` —
both declared as peers.

The chain is: Poveste requires Vite 8 → only `@sveltejs/vite-plugin-svelte@7` peers Vite 8
→ v7 requires `svelte@^5.46.4`. Svelte `5.0`–`5.46.3` cannot be assembled into a working
project, which is why the floor is not `^5.0.0`.

Svelte 4 is further out for the same reason: its last compatible plugin is v3, which caps at
Vite 5. No release pairs Svelte 4 with the Vite we require.
:::

### The Vite config

Poveste builds through your project's own Vite config rather than one of its own, so a Svelte project also needs [`@sveltejs/vite-plugin-svelte`](https://www.npmjs.com/package/@sveltejs/vite-plugin-svelte). The block above explains which version to use; this is where it goes.

That plugin and `@poveste/plugin-svelte` do different jobs: one teaches Vite to compile `.svelte` files, the other teaches Poveste to collect and render stories. Installing the second does not bring the first.

If you are adding Poveste to an existing Svelte app you already have this. Starting from an empty project, without it the first build fails while reading your first component, and the error does not name the plugin you are missing.

```shell
pnpm i -D vite @sveltejs/vite-plugin-svelte
# OR
npm i -D vite @sveltejs/vite-plugin-svelte
# OR
yarn add -D vite @sveltejs/vite-plugin-svelte
```

```ts
// vite.config.ts
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    svelte(),
  ],
})
```

SvelteKit already has this plugin and a `vite.config.ts` — see [SvelteKit](#sveltekit) below, which adds Poveste to the config you have rather than creating one.

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

<div class="demo-links-box border-red-200 dark:border-red-900">
  <img src="/svelte.svg" alt="SvelteKit logo" class="w-10 h-10 mt-3 object-contain" />
  <DemoLinks framework="sveltekit" />
</div>

Poveste supports SvelteKit through the same `@poveste/plugin-svelte` package — there is no
separate SvelteKit plugin to install.

The difference is where the configuration goes. SvelteKit already owns `vite.config.ts`, so
the tidier option is the `poveste` key of that file rather than a standalone
`poveste.config.ts`; Poveste reads both and merges them. Nothing about `svelte.config.js` or
your adapter changes.

`@poveste/plugin-svelte` declares `@sveltejs/kit@^2.53.0` as an **optional** peer — enforced
when Kit is installed, ignored when it is not, since the same package serves plain Svelte.
`2.53.0` is the first SvelteKit release to peer Vite 8.

The full setup, including the `poveste` key typing and what not to reach for when TypeScript
complains, now lives on its own page:
**[Getting started with SvelteKit](../sveltekit/getting-started.md)**.
## Configuration

Learn more about configuring Poveste [here](../config.md).

## Community

If you have questions or need help, reach out to the community on [GitHub Discussions](https://github.com/poveste-dev/poveste/discussions).
