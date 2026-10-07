---
title: 'Getting started with SvelteKit — add Poveste to the config you have'
description: 'SvelteKit uses the same Svelte plugin, configured through the vite.config.ts SvelteKit already owns. Kit 2 from 2.53, and Kit 3, are supported.'
---

# Getting started with SvelteKit

<div class="demo-links-box border-red-200 dark:border-red-900">
  <img src="/svelte.svg" alt="SvelteKit logo" class="w-10 h-10 mt-3 object-contain" />
  <DemoLinks framework="sveltekit" />
</div>

## Installation

SvelteKit uses the same package as plain Svelte — there is no separate SvelteKit plugin.

```shell
pnpm i -D poveste @poveste/plugin-svelte
# OR
npm i -D poveste @poveste/plugin-svelte
# OR
yarn add -D poveste @poveste/plugin-svelte
```

::: tip Just installed and got an older version?
For about a day after a release, pnpm installs the **previous** version, with no error and no warning. Current pnpm prints nothing to say a newer one exists. That's pnpm's release-age cooldown, not a broken publish. A plugin that's new in that release is worse off: nothing comes before its `0.0.1` placeholder, which has no code, so pnpm installs that beside the previous `poveste`, and the only sign is a `deprecated` warning.

pnpm also saves the version it installed to `package.json` as `^x.y.z`, so waiting a day doesn't fix an install you've already run. Run the install line again with one of these:

- the `npm` line above;
- `--config.minimum-release-age=0` added to the `pnpm` line. Use the kebab-case spelling: pnpm 12.4 ignores `--config.minimumReleaseAge=0` without a word;
- exact versions: `poveste@x.y.z` and the plugin at the same version. pnpm installs them, saves them without the `^`, and lists them under `minimumReleaseAgeExclude` in a `pnpm-workspace.yaml` it creates. `@latest` doesn't get you past the cooldown.
:::

::: warning Poveste needs Node `>=22.22.2`, and npm will not tell you
Run `node -v` before you install. On an older Node, `npm i poveste` still succeeds: npm installs the newest earlier Poveste that accepts your Node, and on a recent Node the only warning it prints names a dependency, not Poveste. These docs then describe a version you do not have, and the difference looks like a bug rather than its cause. With `engine-strict=true` in your `.npmrc`, npm refuses with `EBADENGINE` instead. pnpm installs the current version, and Poveste then refuses to start, naming the Node it needs; Yarn 1 refuses to install.

On Node 24, use 24.15 or later: Poveste's DOM dependency (jsdom) accepts `^22.22.2 || ^24.15.0 || >=26`.
:::

::: info Supported versions
`@poveste/plugin-svelte` declares `@sveltejs/kit@^2.53.0 || ^3.0.0` as an **optional** peer: enforced when Kit is installed, ignored when it is not, since the same package serves plain Svelte.

`2.53.0` is the first SvelteKit release to peer Vite 8 and `@sveltejs/vite-plugin-svelte@^7`, and v7 is in turn the first plugin major to peer Vite 8, which Poveste requires.

Each major has a book in CI on every pull request. `examples/sveltekit` is on Kit 2 and runs the full Playwright suite against the built book. `examples/sveltekit3` is a SvelteKit 3 project as `sv create` scaffolds it, checked in `poveste dev` and the built book, with `svelte-check`.
:::

## Configuring it

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
    setupFile: '/src/poveste.setup.ts',
  },
})
```

`setupFile` points at a file of your own that runs before every story — where you import
global CSS, register stores, or install anything your components expect to be there already.
Create it, or drop the key until you have something to put in it. The path is relative to
your project root, which is what the leading slash means. See [Global JS and
CSS](../config.md#global-js-and-css) for what goes inside.

Importing `@poveste/plugin-svelte` is already enough to type the `poveste` key — poveste
augments Vite's config type, and importing any poveste package pulls that augmentation into
your program. The `/// <reference types="poveste" />` line makes it explicit, and is what you
need in a config that sets the `poveste` key without importing a poveste package.

If TypeScript does report the key as unknown, that reference is the fix. Do not reach for
`as any` on the config object: Vite genuinely checks it for unknown keys, so a cast throws
away that checking for everything inside — including the Poveste options you came for.

Nothing else needs changing. Your Kit config and adapter stay where they are: `svelte.config.js` on Kit 2, inside `sveltekit({ ... })` on Kit 3. `@poveste/plugin-svelte` already keeps SvelteKit's own dev server and build out of the book, and runs `svelte-kit sync` for it, so you do not need to configure `viteIgnorePlugins` yourself.

## Command Line Interface

Add the scripts to your `package.json`, alongside the ones SvelteKit already gave you:

```json
{
  "scripts": {
    "story:dev": "poveste dev",
    "story:build": "poveste build",
    "story:preview": "poveste preview"
  }
}
```

## Write your first story

Poveste has nothing to show until a story file exists, and `poveste build` on a book without one says so rather than failing.

**[Writing Svelte stories](../svelte/stories.md)** is the page that shows one.

## Community

If you have questions or need help, reach out to the community on [GitHub Discussions](https://github.com/poveste-dev/poveste/discussions/new?category=q-a).
