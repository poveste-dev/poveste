# @poveste/plugin-react

[React](https://react.dev) support for [Poveste](https://poveste.dev): write stories as `.story.tsx` files and browse them in a Poveste book.

Requires Node `>=22.22.2`, `react@^19.0.0` and `react-dom@^19.0.0`, with a JSX transform such as `@vitejs/plugin-react` in your Vite config. See the [React guide](https://poveste.dev/guide/react/getting-started).

## Get started

```shell
pnpm i -D poveste @poveste/plugin-react
```

Keep `@vitejs/plugin-react` in your `vite.config.ts`, then add the plugin:

```ts
// poveste.config.ts
import { HstReact } from '@poveste/plugin-react'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstReact()],
})
```

A story is a `.story.tsx` file whose default export describes it, and each variant has a `render` that returns JSX:

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

`Badge` stands in for a component of your own. `npx poveste dev` then starts the book. The [React guide](https://poveste.dev/guide/react/getting-started) covers state, setup files and wrappers.

## What it does

It renders stories and variants. The source panel shows the story file. A story that names its component in its `component` field gets a props, slots and events table on its Docs tab, read from the component's types; it needs `typescript` 6 or earlier and `@types/react` in the book. See [Component docs](https://poveste.dev/guide/react/getting-started#component-docs). The controls panel is not wired to React: a variant with `initState` gets the generic state editor, and one without says why there is nothing there.
