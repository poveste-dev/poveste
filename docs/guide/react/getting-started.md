---
title: 'Getting started with React — write stories for React components'
description: 'Install Poveste and the React plugin, add the config, and write your first story as a .story.tsx file. Controls for React are not available yet.'
---

# Getting started with React

<DemoLinks framework="react" note="React 19, renderer only: stories and variants render, and a variant with initState gets the state editor. React has no controls panel yet." />

## Installation

```shell
pnpm i -D poveste @poveste/plugin-react
# OR
npm i -D poveste @poveste/plugin-react
# OR
yarn add -D poveste @poveste/plugin-react
```

You also need `react@^19.0.0` and `react-dom@^19.0.0`, and a JSX transform in your Vite config — `@vitejs/plugin-react`, which a React project built with Vite already has. React 18 is not supported.

Poveste builds the book with Vite whatever builds your app. In a project built with something else, install `vite` and `@vitejs/plugin-react` as dev dependencies and add the `vite.config.ts` below; only Poveste reads it.

::: tip Just installed and got an older version?
For about a day after a release, pnpm installs the **previous** version, with no error. Measured on 0.20.0's release day: pnpm 11.5.3 printed `+ poveste 0.19.1 (0.20.0 is available)`, and pnpm 12.14.0 printed nothing to say a newer one existed. That's pnpm's release-age cooldown, not a broken publish. A plugin that's new in that release is worse off: nothing comes before its `0.0.1` placeholder, which has no code, so pnpm installs that beside the previous `poveste`, and the only sign is a `deprecated` warning.

pnpm also saves the version it installed to `package.json` as `^x.y.z`, so waiting a day doesn't fix an install you've already run. Run the install line again with one of these:

- the `npm` line above;
- `--config.minimum-release-age=0` added to the `pnpm` line. Use the kebab-case spelling: pnpm 12.4.0 ignores `--config.minimumReleaseAge=0` without a word, though 12.14.0 accepts both;
- exact versions: `poveste@x.y.z` and the plugin at the same version. pnpm installs them, saves them without the `^`, and lists them under `minimumReleaseAgeExclude` in a `pnpm-workspace.yaml` it creates. `@latest` doesn't get you past the cooldown.
:::

::: warning Poveste needs Node `>=22.22.2`, and npm will not tell you
Run `node -v` before you install. On an older Node, `npm i poveste` still succeeds: npm installs the newest earlier Poveste that accepts your Node, and on a recent Node the only warning it prints names a dependency, not Poveste. These docs then describe a version you do not have, and the difference looks like a bug rather than its cause. With `engine-strict=true` in your `.npmrc`, npm refuses with `EBADENGINE` instead. pnpm installs the current version, and Poveste then refuses to start, naming the Node it needs; Yarn 1 refuses to install.

On Node 24, prefer 24.15 or later. Poveste's DOM dependency, jsdom, and three of its own dependencies declare `^22.22.2 || ^24.15.0 || >=26`. On 24.13.0 npm warns `EBADENGINE` for each of them and installs anyway, and a Vue book built there, but nothing tests Poveste on a Node 24 before 24.15.
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

Then add the plugin:

```ts
// poveste.config.ts
import { HstReact } from '@poveste/plugin-react'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstReact()],
})
```

The plugin adds `**/*.story.tsx` and `**/*.story.jsx` to the files Poveste looks for, so there is no [`storyMatch`](../../reference/config.md#storymatch) to set.

React stories can sit beside Vue ones in the same book, and beside Solid ones: both are `.story.tsx` files, and each goes to the plugin it imports `defineStory` from. See [More than one framework in a book](../plugins/official.md#more-than-one-framework-in-a-book) for the Vite config that needs.

### In a Vue project

Skip this unless your React components live in a project made from Vite's Vue template. That template compiles JSX for Vue: its `tsconfig.app.json` extends `@vue/tsconfig`, which sets `"jsxImportSource": "vue"`, and Vite follows it. Your React components and stories then compile to Vue's vnodes, so the book builds and every React story shows "This component threw while rendering". The browser console says why:

- under `poveste dev`, `Objects are not valid as a React child (found: object with keys {__v_isVNode, __v_skip, type, props, …})`;
- in a built book, `Minified React error #31` with the same keys.

If the project has no Vue components written in TSX, set React's JSX in `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

If it has some, leave the tsconfig as it is, because that change makes each of them render `[object Object]`. Start every React file with this line instead, the stories and the components they import alike:

```tsx
/** @jsxImportSource react */
```

A pragma on the story file alone is not enough: the component it imports still compiles for Vue. Each way, used where it says, also satisfies `vue-tsc`, which reports type errors in the React files until one of them is in place.

## Write a story

A story is a `.story.tsx` file whose default export describes it. Each variant has a `render` that returns JSX. `Badge` stands in for a component of your own; to follow along as written, this one is enough:

```tsx
// src/Badge.tsx
import type { ReactNode } from 'react'

export function Badge({ tone, children }: { tone: 'info' | 'warn', children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
```

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

In a Vue project that keeps Vue TSX ([above](#in-a-vue-project)), `Badge.tsx` and `Badge.story.tsx` each start with `/** @jsxImportSource react */`, and so does every React file on this page.

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

## Component docs

Name the component a story documents in its `component` field, and its docs tab shows a props, slots and events table read from the type of the component's first parameter:

```tsx
export default defineStory({
  title: 'Badge',
  component: Badge,
  variants: [/* ... */],
})
```

A function component, one typed `FC<Props>`, and one wrapped in `forwardRef` or `memo` are all read; so is a class component, from its constructor's props. Descriptions and tags come from the props' JSDoc. A default is read from a destructured parameter, then from a `@default` tag. Props typed `ReactNode` or `ReactElement`, and `children` taken through `PropsWithChildren`, are slots; `on*` functions are events. The attributes a component inherits from React's own types, such as `ButtonHTMLAttributes`, are left out. It needs `typescript` 6 or earlier installed in the book, and reads its `tsconfig.app.json` or `tsconfig.json`. Props declared in installed packages are left out unless [`autoDocs.allow`](/reference/config#autodocs) names the package.

## State

Give a story or a variant an `initState`, and `render` receives that state and a way to change it. `Counter` again stands in for your own component:

```tsx
// src/Counter.tsx
export function Counter({ count, onIncrement }: { count: number, onIncrement: () => void }) {
  return <button type="button" onClick={onIncrement}>{`Count: ${count}`}</button>
}
```

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

The state editor shows the state and lets you edit it, and an edit renders the story again with the new snapshot. A variant's own `initState` takes precedence over the story's.

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
  setupFile: '/src/poveste.setup.tsx',
})
```

The hook runs before the story mounts, so a wrapper is there for the first render. The first wrapper added is the outermost.

A story or a variant can set its own `setupApp`, called after the global hook with the same argument, `{ story, variant, addWrapper }`. A variant's replaces the story's:

```tsx
// src/Badge.story.tsx
export default defineStory({
  title: 'Badge',
  variants: [
    {
      title: 'On a dark frame',
      setupApp: ({ addWrapper }) => addWrapper(({ children }) => <div className="dark">{children}</div>),
      render: () => <Badge tone="info">Information</Badge>,
    },
  ],
})
```

A story is not rendered inside `StrictMode`. To get its checks, add it as a wrapper in the setup file:

```tsx
// src/poveste.setup.tsx
import { defineSetupReact } from '@poveste/plugin-react'
import { StrictMode } from 'react'

export const setupReact = defineSetupReact(({ addWrapper }) => {
  addWrapper(({ children }) => <StrictMode>{children}</StrictMode>)
})
```

## What is not here yet

- **Controls.** A variant with `initState` gets the state editor; one without says there is nothing to show. Controls built from your components — explicit ones and props detected automatically — come in later releases.
- **Generated source.** The source panel shows the story file. React elements keep no source to generate per-variant code from, which is what the source panel reads in Vue.
