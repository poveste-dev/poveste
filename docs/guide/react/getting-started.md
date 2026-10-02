---
title: 'Getting started with React — write stories for React components'
description: 'Install Poveste and the React plugin, add the config, and write your first story as a .story.tsx file. Controls for React are not available yet.'
---

# Getting started with React

## Installation

```shell
pnpm i -D poveste @poveste/plugin-react
# OR
npm i -D poveste @poveste/plugin-react
# OR
yarn add -D poveste @poveste/plugin-react
```

You also need `react@^19.0.0` and `react-dom@^19.0.0`, and a JSX transform in your Vite config — `@vitejs/plugin-react`, which a React project built with Vite already has. React 18 is not supported.

::: tip Just installed and got an older version?
For about a day after a release, pnpm installs the **previous** version and says so only in passing — `+ poveste x.y.z (x.y.z is available)`, with no error and no warning. That is pnpm's release-age cooldown holding back anything published in the last 24 hours, not a broken publish. Use the `npm` line above, wait it out, or pass `--config.minimum-release-age=0` — the kebab-case spelling, because pnpm 12 accepts the camelCase one and silently ignores it. Asking for the exact version does not get you past it: pnpm 12 refuses a version inside the window too, with `ERR_PNPM_NO_MATURE_MATCHING_VERSION`.
:::

::: warning Poveste needs Node `>=24.15.0`, and npm will not tell you
Run `node -v` before you install. On an older Node, `npm i poveste` still succeeds: npm installs the newest earlier Poveste that accepts your Node, and on a recent Node the only warning it prints names a dependency, not Poveste. These docs then describe a version you do not have, and the difference looks like a bug rather than its cause. With `engine-strict=true` in your `.npmrc`, npm refuses with `EBADENGINE` instead. pnpm installs the current version, and Poveste then refuses to start, naming the Node it needs; Yarn 1 refuses to install.
:::

<!-- Remove this block once plugins can add story patterns rather than replace them (#1124). -->
::: warning Set `storyMatch`, or the book is empty
Add `storyMatch: ['**/*.story.tsx']` to your Poveste config, as [below](#configuration). Without it Poveste looks only for `.story.vue` and `.story.svelte`: the build succeeds and the book is empty, and the only sign is `Built 0 stories in … — nothing matched **/*.story.vue, **/*.story.svelte`. Setting it replaces those defaults, which matters only in a book that also has Vue or Svelte stories — list their patterns too.
:::

## Configuration

Keep `@vitejs/plugin-react` in your Vite config — Poveste reads it, so story files compile the way your components do, and editing a component refreshes it in place:

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
})
```

Then add the plugin, and tell Poveste which files are stories:

```ts
// poveste.config.ts
import { HstReact } from '@poveste/plugin-react'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstReact()],
  storyMatch: ['**/*.story.tsx'],
})
```

## Write a story

A story is a `.story.tsx` file whose default export describes it. Each variant has a `render` that returns JSX:

```tsx
// src/Badge.story.tsx
import { defineStory } from '@poveste/plugin-react'
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

## State

Give a story or a variant an `initState`, and `render` receives that state and a way to change it:

```tsx
// src/Counter.story.tsx
import { defineStory } from '@poveste/plugin-react'
import { Counter } from './Counter'

export default defineStory<{ count: number }>({
  title: 'Counter',
  initState: () => ({ count: 0 }),
  variants: [
    {
      title: 'From zero',
      render: ({ state, setState }) => (
        <Counter count={state.count} onIncrement={() => setState(s => ({ count: s.count + 1 }))} />
      ),
    },
    {
      title: 'From ten',
      initState: () => ({ count: 10 }),
      render: ({ state, setState }) => (
        <Counter count={state.count} onIncrement={() => setState(s => ({ count: s.count + 1 }))} />
      ),
    },
  ],
})
```

`render` is a component body: it runs again on every change, with `state` a fresh snapshot each time, so hooks work inside it as they would in any component. `setState` merges what you pass into the state, as a class component's `setState` does — the keys that change, or a function of the current state.

The state panel shows the state and lets you edit it, and an edit renders the story again with the new snapshot. A variant's own `initState` takes precedence over the story's.

## Setup and wrappers

Export `setupReact` from your [setup file](../config.md#global-js-and-css) to run code before every story mounts. `addWrapper` puts a component around each one — a theme provider, a router, a context:

```tsx
// src/poveste.setup.tsx
import { defineSetupReact } from '@poveste/plugin-react'

export const setupReact = defineSetupReact(({ addWrapper }) => {
  addWrapper(({ children }) => <div className="story-frame">{children}</div>)
})
```

```ts
// poveste.config.ts
export default defineConfig({
  plugins: [HstReact()],
  storyMatch: ['**/*.story.tsx'],
  setupFile: 'src/poveste.setup.tsx',
})
```

The hook runs before the story mounts, so a wrapper is there for the first render. The first wrapper added is the outermost. A variant can set its own `setupApp`, called after the global hook with the same argument: `{ story, variant, addWrapper }`.

A story is not rendered inside `StrictMode`. Add it as a wrapper if you want its checks.

## What is not here yet

- **Controls.** A variant with `initState` gets the state panel; one without says there is nothing to show. Controls built from your components — explicit ones and props detected automatically — come in later releases.
- **Generated source.** The source panel shows the story file. React elements keep no source to generate per-variant code from, which is what the source panel reads in Vue.
