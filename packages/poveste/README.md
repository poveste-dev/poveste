# poveste

> Fast and beautiful interactive component playgrounds

Poveste builds a browsable *book* of stories from your components, powered by
[Vite](https://vite.dev). It is a drop-in fork of
[histoire](https://github.com/histoire-dev/histoire), covering Vue, Nuxt, Svelte,
SvelteKit and Quasar — the last of which no released version of histoire includes — and
Solid and React, whose stories render with no controls panel yet.

In every one of those books, each story's **Docs** tab also shows a props, slots and
events table read from its components' types: the ones a Vue or Svelte story imports, or
the one a Solid or React story names in its `component` field, with a TypeScript 6 the
framework plugin installs, whatever TypeScript the book has. A React book needs
`@types/react`.

<img src="https://raw.githubusercontent.com/poveste-dev/poveste/main/screenshot.png" alt="A poveste book: the story list, a variant grid, and the controls panel" width="900">

## Install

Install `poveste` alongside the plugin for your framework:

```shell
pnpm i -D poveste @poveste/plugin-vue                          # Vue 3
pnpm i -D poveste @poveste/plugin-svelte                       # Svelte 5 and SvelteKit
pnpm i -D poveste @poveste/plugin-vue @poveste/plugin-nuxt     # Nuxt 4
pnpm i -D poveste @poveste/plugin-vue @poveste/plugin-quasar   # Quasar
pnpm i -D poveste @poveste/plugin-solid                        # Solid, no controls yet
pnpm i -D poveste @poveste/plugin-react                        # React 19, no controls yet
```

> **Installed an older version than you expected?** For about a day after a release, pnpm installs the previous one with no error, and for a plugin that's new in that release, its empty `0.0.1` placeholder. pnpm 11.5.3 added `(x.y.z is available)` after the version it installed; pnpm 12.14.0 said nothing. That's pnpm's release-age cooldown, not a broken publish. `package.json` keeps the old `^x.y.z`, so waiting doesn't fix it: install again with `npm`, with `--config.minimum-release-age=0` (kebab-case: pnpm 12.4.0 ignores the camelCase spelling, which 12.14.0 accepts), or with exact versions.

Then create a `poveste.config.ts` in your project root. For a Vue project it is this:

```ts
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstVue(),
  ],
})
```

Every other framework uses its own plugin, and Quasar also needs a setup file, so take the config from its guide: [Svelte](https://poveste.dev/guide/svelte/getting-started), [SvelteKit](https://poveste.dev/guide/sveltekit/getting-started), [Nuxt](https://poveste.dev/guide/nuxt/getting-started), [Quasar](https://poveste.dev/guide/quasar/getting-started), [Solid](https://poveste.dev/guide/solid/getting-started) or [React](https://poveste.dev/guide/react/getting-started).

## Commands

| | |
| --- | --- |
| `poveste dev` | development server with hot reload |
| `poveste build` | build the book for production |
| `poveste preview` | serve the built book |

Run `npx poveste --help` for the full list of options.

## Requirements

Node `>=22.22.2` and Vite `^8.0.0`. See
[supported versions](https://poveste.dev/guide/getting-started#supported-versions) for
what proves each range.

On Node 24, prefer 24.15 or later. Poveste's DOM dependency, jsdom, and three of its own dependencies declare `^22.22.2 || ^24.15.0 || >=26`. On 24.13.0 npm warns `EBADENGINE` for each of them and installs anyway, and a Vue book built there, but nothing tests Poveste on a Node 24 before 24.15.

Auto-docs, the props, slots and events table in Vue, Nuxt, Quasar, Svelte, SvelteKit, Solid and React books, reads the types with a TypeScript 6 each framework plugin installs, so a book needs none of its own, and one on TypeScript 7 is read the same way. A React book needs `@types/react`; without it, auto-docs for React turns itself off and says so once. See [`autoDocs`](https://poveste.dev/reference/config#autodocs).

## Links

- [Documentation](https://poveste.dev)
- [Migrating from histoire](https://poveste.dev/guide/migration-from-histoire)
- [GitHub](https://github.com/poveste-dev/poveste)
