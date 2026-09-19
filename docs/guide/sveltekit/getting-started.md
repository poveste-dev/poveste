---
title: 'Getting started with SvelteKit — add Poveste to the config you have'
description: 'SvelteKit uses the same Svelte plugin, configured through the vite.config.ts SvelteKit already owns. The supported floor is Kit 2.53.'
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
For about a day after a release, pnpm installs the **previous** version and says so only in passing — `+ poveste x.y.z (x.y.z is available)`, with no error and no warning. That is pnpm's release-age cooldown holding back anything published in the last 24 hours, not a broken publish. Use the `npm` line above, wait it out, or pass `--config.minimum-release-age=0` — the kebab-case spelling, because pnpm 12 accepts the camelCase one and silently ignores it. Asking for the exact version does not get you past it: pnpm 12 refuses a version inside the window too, with `ERR_PNPM_NO_MATURE_MATCHING_VERSION`.
:::

::: info Supported versions
`@poveste/plugin-svelte` declares `@sveltejs/kit@^2.53.0` as an **optional** peer — enforced
when Kit is installed, ignored when it is not, since the same package serves plain Svelte.

`2.53.0` is the first SvelteKit release to peer Vite 8 and `@sveltejs/vite-plugin-svelte@^7`,
and v7 is in turn the first plugin major to peer Vite 8, which Poveste requires. CI runs
ahead of the floor: `examples/sveltekit` pins `^2.55.0`.

That example is the most thoroughly checked one we have: build, Playwright, and
`svelte-check` on every pull request.
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

Nothing else needs changing. `svelte.config.js` and your adapter stay as they are, and
`@poveste/plugin-svelte` already excludes SvelteKit's compile plugin from the stories build,
so you do not need to configure `viteIgnorePlugins` yourself.

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
