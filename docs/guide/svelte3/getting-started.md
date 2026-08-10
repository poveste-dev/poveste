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

<DemoLinks framework="svelte3" />

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

## Configuration

Learn more about configuring Poveste [here](../config.md).

## Community

If you have questions or need help, reach out to the community on [GitHub Discussions](https://github.com/poveste-dev/poveste/discussions).
