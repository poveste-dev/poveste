# poveste

> Fast and beautiful interactive component playgrounds

Poveste builds a browsable *book* of stories from your components, powered by
[Vite](https://vite.dev). It is a drop-in fork of
[histoire](https://github.com/histoire-dev/histoire), covering Vue, Nuxt, Svelte,
SvelteKit and Quasar — the last of which histoire does not support.

<img src="https://raw.githubusercontent.com/poveste-dev/poveste/main/screenshot.png" alt="A poveste book: the story list, a variant grid, and the controls panel" width="900">

## Install

Install `poveste` alongside the plugin for your framework:

```shell
pnpm i -D poveste @poveste/plugin-vue      # Vue 3
pnpm i -D poveste @poveste/plugin-svelte   # Svelte 5 and SvelteKit
pnpm i -D poveste @poveste/plugin-nuxt     # Nuxt 4
pnpm i -D poveste @poveste/plugin-quasar   # Quasar
```

Then create a `poveste.config.ts` in your project root:

```ts
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstVue(),
  ],
})
```

## Commands

| | |
| --- | --- |
| `poveste dev` | development server with hot reload |
| `poveste build` | build the book for production |
| `poveste preview` | serve the built book |

Run `npx poveste --help` for the full list of options.

## Requirements

Node `^22.22.2 || ^24.15.0 || >=26.0.0` and Vite `^8.0.0`. See
[supported versions](https://poveste.dev/guide/getting-started.html#supported-versions) for
what proves each range.

## Links

- [Documentation](https://poveste.dev)
- [Migrating from histoire](https://poveste.dev/guide/migration-from-histoire.html)
- [GitHub](https://github.com/poveste-dev/poveste)
