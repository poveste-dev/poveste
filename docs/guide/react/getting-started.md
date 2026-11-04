---
title: 'Getting started with React — write stories for React components'
description: 'Install Poveste and the React plugin, add the config, and write your first story as a .story.tsx file. Controls for React are not available yet.'
---

# Getting started with React

<DemoLinks framework="react" note="React 19: stories and variants render, a story that names its component gets the props, slots and events table, and a variant with initState gets the state editor. React has no controls panel yet." />

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
For about a day after a release, pnpm installs the **previous** version, with no error. That's pnpm's release-age cooldown, not a broken publish. Check what landed with `pnpm list poveste`, because the install may not say: pnpm 11.5.3 adds `(x.y.z is available)` to its output, and 11.28.9 and 12.16.1 print nothing. A plugin that's new in that release is worse off: nothing comes before its `0.0.1` placeholder, which has no code, so pnpm installs that beside the previous `poveste`, and the only sign is a `deprecated` warning.

To get the new version, whether or not you've already installed, name it. `npm view poveste version` prints it:

```bash
pnpm add -D "poveste@^x.y.z" "@poveste/plugin-react@^x.y.z"
```

pnpm installs them and lists them under `minimumReleaseAgeExclude` in a `pnpm-workspace.yaml` it creates. Commit that file, so later installs and CI accept them too.

These don't get you there once the old version is in `package.json`:

- **The install line again.** `package.json` now says the old `^x.y.z`, and pnpm keeps it, even after the cooldown. Once the cooldown has passed, `pnpm up -L poveste @poveste/plugin-react` works.
- **`@latest`.** During the cooldown, pnpm stays on the old version.
- **The `npm` line.** It fails inside a pnpm-installed `node_modules`, and with `node_modules` deleted it installs the old version again. It only helps a project with no Poveste yet.

Avoid `--config.minimum-release-age=0`. With a named version or `pnpm up -L` it does install the new one, but then every later `pnpm i`, in CI too, fails until the cooldown passes, because the lockfile holds versions the cooldown rejects. That includes a project with no Poveste yet.
:::

::: warning Poveste needs Node `>=22.22.2`, and npm will not tell you
Run `node -v` before you install. On an older Node, `npm i poveste` still succeeds: npm installs the newest earlier Poveste that accepts your Node, which can be a long way back. On Node 22.21.1 and 20.19.0 that's 0.6.1. The sign is `npm warn deprecated` on six Poveste packages, each saying to install `@latest`, so update Node and do that. These docs otherwise describe a version you do not have, and the difference looks like a bug rather than its cause. With `engine-strict=true` in your `.npmrc`, npm refuses with `EBADENGINE` instead. pnpm installs the current version, and Poveste then refuses to start, naming the Node it needs; Yarn 1 refuses to install.

On Node 24, prefer 24.15 or later. Poveste's DOM dependency, jsdom, and three of its own dependencies declare `^22.22.2 || ^24.15.0 || >=26`. On 24.13.0 npm warns `EBADENGINE` for each of them and installs anyway, and a Vue book built there, but nothing tests Poveste on a Node 24 before 24.15.
:::

## Configuration

Keep `@vitejs/plugin-react` in your Vite config — Poveste reads it, so story files compile the way your components do, and editing a component refreshes it in place:

```ts twoslash
// vite.config.ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
})
```

Then add the plugin:

```ts twoslash
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

```tsx twoslash
/** @jsxImportSource react */
```

A pragma on the story file alone is not enough: the component it imports still compiles for Vue. Each way, used where it says, also satisfies `vue-tsc`, which reports type errors in the React files until one of them is in place.

## Write a story

A story is a `.story.tsx` file whose default export describes it. Each variant has a `render` that returns JSX. `Badge` stands in for a component of your own; to follow along as written, this one is enough:

```tsx twoslash
// src/Badge.tsx
import type { ReactNode } from 'react'

export function Badge({ tone, children }: { tone: 'info' | 'warn', children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
```

```tsx twoslash
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
// ---cut-after---
// @filename: Badge.tsx
export declare function Badge(props: { tone: 'info' | 'warn', children?: import('react').ReactNode }): import('react').ReactNode
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

```tsx twoslash
import { defineStory } from '@poveste/plugin-react'
import { Badge } from './Badge'
// ---cut---
export default defineStory({
  title: 'Badge',
  component: Badge,
  variants: [/* ... */],
})
// ---cut-after---
// @filename: Badge.tsx
export declare function Badge(props: { tone: 'info' | 'warn', children?: import('react').ReactNode }): import('react').ReactNode
```

A function component, one typed `FC<Props>`, and one wrapped in `forwardRef` or `memo` are all read; so is a class component, from its constructor's props. Descriptions and tags come from the props' JSDoc. A default is read from a destructured parameter, then from a `@default` tag. Props typed `ReactNode` or `ReactElement`, and `children` taken through `PropsWithChildren`, are slots; `on*` functions are events. The attributes a component inherits from React's own types, such as `ButtonHTMLAttributes`, are left out. It reads the types with a TypeScript 6 Poveste installs, whatever TypeScript the book has, including the TypeScript 7 Vite's `react-ts` template installs, and reads the book's `tsconfig.app.json` or `tsconfig.json`. It needs `@types/react` in the book, `npm i -D @types/react`: React ships no types of its own, so without it every component would read as `any`, and auto-docs turns off instead and says so once in the log. Props declared in installed packages are left out unless [`autoDocs.allow`](/reference/config#autodocs) names the package.

`component` takes one component, not a list. A story without it gets no table, and its Docs tab says why unless the story has docs of its own. A story that names a library's component, such as `Button` from `@mantine/core`, shows the component's name and no rows until `allow` names the package, because every prop it has is declared there; with `allow: ['@mantine/core']` it gets the full table.

A story's `autoDocs` field chooses its own table: `false` for none, or a list of the sections to show, such as `['props', 'events']`. See [`autoDocs`](/reference/config#autodocs).

## State

Give a story or a variant an `initState`, and `render` receives that state and a way to change it. `Counter` again stands in for your own component:

```tsx twoslash
// src/Counter.tsx
export function Counter({ count, onIncrement }: { count: number, onIncrement: () => void }) {
  return <button type="button" onClick={onIncrement}>{`Count: ${count}`}</button>
}
```

```tsx twoslash
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
// ---cut-after---
// @filename: Counter.tsx
export declare function Counter(props: { count: number, onIncrement: () => void }): import('react').ReactNode
```

`render` is a component body: it runs again on every change, with `state` a fresh snapshot each time, so hooks work inside it as they would in any component. `setState` merges what you pass into the state, as a class component's `setState` does — the keys that change, or a function of the current state.

The state editor shows the state and lets you edit it, and an edit renders the story again with the new snapshot. A variant's own `initState` takes precedence over the story's.

## Source

The Source panel's **Dynamic** view prints what a variant's `render` returns, as JSX, with each value as it is now, and follows the state as the panel or the story changes it:

```
<Counter count={10} label="Clicked" onIncrement={…} />
```

A function prop prints as `{…}`. A hook's own state, such as a `useState` inside `render`, lives in the preview, so the source shows its starting value. A variant's own `source` string replaces the generated code, and **Static** shows the story file.

Dynamic prints a component by the name it has at runtime, because the variable it's assigned to isn't in the element. If that name can't be written as a tag, the panel opens on **Static** rather than print one that won't render, and the Dynamic button's tooltip says why. That covers `memo(() => …)`, `forwardRef(() => …)`, `lazy(…)` and a context with no `displayName`, a `displayName` like `Styled(Button)`, and a lower-case name like `memo(function card() { … })`. To keep Dynamic, give it a capitalized name: `memo(function Card() { … })`, or set `displayName` on it.

## Setup and wrappers

Export `setupReact` from your [setup file](../config.md#global-js-and-css) to run code before every story mounts. `addWrapper` puts a component around each one — a theme provider, a router, a context:

```tsx twoslash
// src/poveste.setup.tsx
import { defineSetupReact } from '@poveste/plugin-react'

export const setupReact = defineSetupReact(({ addWrapper }) => {
  addWrapper(({ children }) => <div className="story-frame">{children}</div>)
})
```

```ts twoslash
import { HstReact } from '@poveste/plugin-react'
import { defineConfig } from 'poveste'
// ---cut---
// poveste.config.ts
export default defineConfig({
  plugins: [HstReact()],
  setupFile: '/src/poveste.setup.tsx',
})
```

The hook runs before the story mounts, so a wrapper is there for the first render. The first wrapper added is the outermost.

A story or a variant can set its own `setupApp`, called after the global hook with the same argument, `{ story, variant, addWrapper }`. A variant's replaces the story's:

```tsx twoslash
import { defineStory } from '@poveste/plugin-react'
import { Badge } from './Badge'
// ---cut---
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
// ---cut-after---
// @filename: Badge.tsx
export declare function Badge(props: { tone: 'info' | 'warn', children?: import('react').ReactNode }): import('react').ReactNode
```

A story is not rendered inside `StrictMode`. To get its checks, add it as a wrapper in the setup file:

```tsx twoslash
// src/poveste.setup.tsx
import { defineSetupReact } from '@poveste/plugin-react'
import { StrictMode } from 'react'

export const setupReact = defineSetupReact(({ addWrapper }) => {
  addWrapper(({ children }) => <StrictMode>{children}</StrictMode>)
})
```

## What is not here yet

- **Controls.** A variant with `initState` gets the state editor; one without says there is nothing to show. Controls built from your components — explicit ones and props detected automatically — come in later releases.
