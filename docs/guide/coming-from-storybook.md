---
title: 'Coming from Storybook — a Vite-native component playground for Vue, Nuxt, Svelte, SvelteKit and Quasar, with Solid and React renderers'
description: 'What a Poveste book is, how stories are written as ordinary components, what a built book weighs, and what Poveste does not do.'
---

# Coming from Storybook

Poveste is a component playground built on Vite, for Vue, Nuxt, Svelte, SvelteKit and Quasar, with Solid and React supported as renderers. If you already run Storybook, this page is what is different here — not a case for switching.

## A story is a component, not a separate format

There is no story format to learn. A story is a file in the framework you already write, using two components:

```vue
<!-- src/components/Button.story.vue -->
<script setup>
import Button from './Button.vue'
</script>

<template>
  <Story title="Button">
    <Variant title="Primary">
      <Button primary>
        Save
      </Button>
    </Variant>
    <Variant title="Disabled">
      <Button disabled>
        Save
      </Button>
    </Variant>
  </Story>
</template>
```

That is the whole API for a basic story: `<Story>` and `<Variant>`. State and controls are added with [`initState` and the `Hst*` controls](./vue/controls.md) when a variant needs them (`HstText`, `HstSelect` and the rest are Poveste's built-in controls; the prefix comes from histoire, which Poveste is a fork of), and Poveste builds a control per declared prop on its own — for [Vue](./vue/controls.md) from the rendered component, for [Svelte](./svelte/controls.md#automatic-controls) from the component's source.

## Your Vite config is the build

Poveste resolves your Vite config and runs the book through it, so aliases, plugins, `define` and your TypeScript and CSS setup apply to stories because they are the same pipeline — not because they were copied into a second one. Where a framework needs handling, its plugin does it: `@poveste/plugin-quasar` fetches the config Quasar builds asynchronously, `@poveste/plugin-nuxt` runs a Nuxt build, and you configure neither by hand.

Poveste can also be configured entirely from `vite.config.ts` under a `poveste` key, with no config file of its own — which is how `examples/svelte` and `examples/sveltekit` are set up.

## What a book weighs

`examples/vue`, same `story:build` command either side of [#590](https://github.com/poveste-dev/poveste/pull/590):

| | highlighter chunk | whole book |
| --- | ---: | ---: |
| before | 9,960 KB | 14,012 KB |
| after | **1,346 KB** | **4,992 KB** |

The highlighter had been importing from the `shiki` barrel, which ships every grammar and theme; it now names the two the source pane uses. `pnpm test:bundle-size` holds a built book to a ceiling, and its largest chunks to their own, so this stays true rather than being a number from one afternoon. The smoke test does the same for the chunk a reader downloads first in a book installed from npm, which is shaped differently from the one in this repository.

## Five frameworks, each with a book CI builds

[Vue](./vue/getting-started.md), [Nuxt](./nuxt/getting-started.md), [Svelte](./svelte/getting-started.md), [SvelteKit](./sveltekit/getting-started.md) and [Quasar](./quasar/getting-started.md) each have an example book in [this repository](https://github.com/poveste-dev/poveste/tree/main/examples), built and driven by Playwright on every commit. The shared specs run against all of them, so support means a job that fails rather than a row in a table.

[Solid](./solid/getting-started.md) and [React](./react/getting-started.md) are renderers only. Each has an example book that CI builds and runs that renderer's own specs on; the shared specs do not run on them.

## What Poveste does not do

Worth knowing before you spend an afternoon:

- **No controls panel for Solid or React.** Their stories and variants render, a variant with `initState` gets the state editor, and the source panel shows the story file. Nothing builds a control per prop for them, as Storybook's Controls does from `args`.
- **No Angular, Preact, Lit or Qwik.** The plugin interface is public and a framework plugin is possible, but nobody has written those.
- **No addon ecosystem.** Poveste has a [plugin API](./plugins/development.md) for collection and setup, and official plugins for the frameworks, Tailwind, Percy and screenshots. It is not a marketplace, and an addon you rely on has no equivalent here.
- **It is a small project.** Poveste is a fork of [histoire](https://github.com/histoire-dev/histoire), currently pre-1.0 — [what 1.0 means](./getting-started.md#what-1-0-means) is written down, along with [what a deprecation promises](./getting-started.md#deprecations).

## Your existing stories

Poveste does not read Storybook's `*.stories.*` files. A story here is a component file, `Button.story.vue` beside `Button.vue`, so each one is written again in that form. The variants, args and decorators of a CSF file map onto `<Variant>`, `initState` and [a setup file's wrappers](./vue/wrapper.md), but nothing converts them for you.

## Trying it

In a Vue project that already builds with Vite and `@vitejs/plugin-vue`:

```sh
pnpm i -D poveste @poveste/plugin-vue
```

```ts
// poveste.config.ts
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue()],
})
```

```json
{
  "scripts": {
    "story:dev": "poveste dev",
    "story:build": "poveste build",
    "story:preview": "poveste preview"
  }
}
```

Poveste reads your existing `vite.config`, so nothing else is needed. The [Getting started](./getting-started.md) page has the commands for every framework. The Solid and React pages have a story to copy on the page itself; the others link to the page that shows one.
