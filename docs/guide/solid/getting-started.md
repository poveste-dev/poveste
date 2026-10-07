---
title: 'Getting started with Solid — write stories for SolidJS components'
description: 'Install Poveste and the Solid plugin, add the config, and write your first story as a .story.tsx file. Controls for Solid are not available yet.'
---

# Getting started with Solid

## Installation

```shell
pnpm i -D poveste @poveste/plugin-solid
# OR
npm i -D poveste @poveste/plugin-solid
# OR
yarn add -D poveste @poveste/plugin-solid
```

You also need `solid-js@^1.9.0` and `vite-plugin-solid@^2.11.0`, which a Solid project built with Vite already has.

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

<!-- Remove this block once plugins can add story patterns rather than replace them (#1124). -->
::: warning Set `storyMatch`, or the book is empty
Add `storyMatch: ['**/*.story.tsx']` to your Poveste config, as [below](#configuration). Without it Poveste looks only for `.story.vue` and `.story.svelte`: the build succeeds and the book is empty, and the only sign is `Built 0 stories in … — nothing matched **/*.story.vue, **/*.story.svelte`. Setting it replaces those defaults, which matters only in a book that also has Vue or Svelte stories — list their patterns too.
:::

## Configuration

Keep `vite-plugin-solid` in your Vite config — Poveste reads it, so story files compile the way your components do:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
})
```

Then add the plugin, and tell Poveste which files are stories:

```ts
// poveste.config.ts
import { HstSolid } from '@poveste/plugin-solid'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstSolid()],
  storyMatch: ['**/*.story.tsx'],
})
```

## Write a story

A story is a `.story.tsx` file whose default export describes it. Each variant has a `render` that returns JSX. `Badge` stands in for a component of your own; to follow along as written, this one is enough:

```tsx
// src/Badge.tsx
import type { JSX } from 'solid-js'

export function Badge(props: { tone: 'info' | 'warn', children: JSX.Element }) {
  return <span class={`badge badge-${props.tone}`}>{props.children}</span>
}
```

```tsx
// src/Badge.story.tsx
import { defineStory } from '@poveste/plugin-solid'
import { Badge } from './Badge'

export default defineStory({
  title: 'Badge',
  variants: [
    { title: 'Info', render: () => <Badge tone="info">Information</Badge> },
    { title: 'Warning', render: () => <Badge tone="warn">Careful</Badge> },
  ],
})
```

A story with no `variants` and a `render` of its own has one implicit variant. `id`, `group`, `icon`, `layout` and `source` work as they do for the other frameworks.

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

## State

Give a story or a variant an `initState`, and `render` receives that state and a way to change it. `Counter` again stands in for your own component:

```tsx
// src/Counter.tsx
export function Counter(props: { count: number, onIncrement: () => void }) {
  return <button onClick={props.onIncrement}>{`Count: ${props.count}`}</button>
}
```

```tsx
// src/Counter.story.tsx
import { defineStory } from '@poveste/plugin-solid'
import { Counter } from './Counter'

export default defineStory<{ count: number }>({
  title: 'Counter',
  initState: () => ({ count: 0 }),
  variants: [
    {
      title: 'From zero',
      render: ({ state, setState }) => (
        <Counter count={state.count} onIncrement={() => setState('count', c => c + 1)} />
      ),
    },
    {
      title: 'From ten',
      initState: () => ({ count: 10 }),
      render: ({ state, setState }) => (
        <Counter count={state.count} onIncrement={() => setState('count', c => c + 1)} />
      ),
    },
  ],
})
```

`render` runs **once**, as a Solid component does. `state` is a Solid store, so reading `state.count` inside the JSX is what keeps the output current — read it outside, at the top of `render`, and the value is fixed at the first render. `setState` is the store's setter, with the same path syntax.

The state panel shows the state and lets you edit it, and an edit reaches the story without running `render` again. A variant's own `initState` takes precedence over the story's.

## Setup and wrappers

Export `setupSolid` from your [setup file](../config.md#global-js-and-css) to run code before every story mounts. `addWrapper` puts a component around each one — a theme provider, a layout frame, a context:

```tsx
// src/poveste.setup.tsx
import { defineSetupSolid } from '@poveste/plugin-solid'

export const setupSolid = defineSetupSolid(({ addWrapper }) => {
  addWrapper(props => <div class="story-frame">{props.children}</div>)
})
```

```ts
// poveste.config.ts
export default defineConfig({
  plugins: [HstSolid()],
  storyMatch: ['**/*.story.tsx'],
  setupFile: 'src/poveste.setup.tsx',
})
```

The hook runs before the story mounts, so a wrapper is there for the first render. The first wrapper added is the outermost. A variant can set its own `setupApp`, called after the global hook with the same argument: `{ story, variant, addWrapper }`.

## What is not here yet

- **Controls.** A variant with `initState` gets the state panel; one without says there is nothing to show. Controls built from your components — explicit ones and props detected automatically — come in later releases.
- **Generated source.** The source panel shows the story file. Solid compiles JSX to DOM operations and keeps no render tree, which is what generating per-variant source reads in Vue.
