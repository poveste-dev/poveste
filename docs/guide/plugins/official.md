---
title: 'Official plugins — Vue, Nuxt, Svelte, Quasar, Solid, React, Tailwind and more'
description: 'The plugins Poveste publishes, what each one is for, and which you need for your framework.'
---

# Official Plugins

- [@poveste/plugin-vue](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-vue): Vue 3 (support plugin)
- [@poveste/plugin-nuxt](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-nuxt): Nuxt 4
- [@poveste/plugin-quasar](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-quasar): Quasar 2 (support plugin)
- [@poveste/plugin-svelte](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-svelte): Svelte 5 and SvelteKit
- [@poveste/plugin-solid](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-solid): SolidJS, with the props table and no controls yet
- [@poveste/plugin-react](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-react): React 19, with the props table and no controls yet
- [@poveste/plugin-tailwind](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-tailwind): Renders a Tailwind design system as a story
- [@poveste/plugin-percy](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-percy): Visual regression testing with Percy
- [@poveste/plugin-screenshot](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-screenshot): Visual regression testing (simple)

## More than one framework in a book

One book can hold stories for two frameworks, such as a Vue library with a few Solid widgets, or a codebase halfway through a migration. Install each framework's Poveste plugin beside `poveste`:

```shell
pnpm i -D poveste @poveste/plugin-vue @poveste/plugin-solid
```

For about a day after a release, pnpm installs the previous version without a word, and a plugin new in that release as its empty placeholder. If the versions look wrong, the tip under the Vue guide's [Installation](../vue/getting-started.md#installation) says how to get the current one.

Each framework and its Vite plugin have to be installed too. A project that already uses both has them; one adding Vue for the first time installs `vue` and `@vitejs/plugin-vue`. Then list both in each config:

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [vue(), solid()],
})
```

```ts
// poveste.config.ts
import { HstSolid } from '@poveste/plugin-solid'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue(), HstSolid()],
})
```

Each story is rendered by the plugin that claims its file: `.story.vue` by Vue, `.story.tsx` and `.story.jsx` by Solid. The two Vite plugins need no `include` or `exclude` to stay out of each other's way, since `vue()` compiles `.vue` files and `solid()` compiles JSX. Vue with React is the same, with `react()` and `HstReact()` in place of the Solid pair, and one thing more in a project made from Vite's Vue template: its tsconfig compiles JSX for Vue, so every React story shows "This component threw while rendering" and React error #31 until React's JSX is set. The React guide shows [what to set](../react/getting-started.md#in-a-vue-project).

Svelte with Solid or React follows the same pattern, `HstSvelte()` beside the JSX framework's pair. No example book builds that combination, so it is untested; Vue with React is the pair CI builds, in `examples/react`.

Each framework's stories are written as its own guide shows: [a Vue story](../vue/stories.md) is a `.story.vue` file, and a [Solid](../solid/getting-started.md#write-a-story) or [React](../react/getting-started.md#write-a-story) one is a `.story.tsx` file.

**There is no [`storyMatch`](../../reference/config.md#storymatch) to set.** `@poveste/plugin-solid` and `@poveste/plugin-react` each add their patterns to the defaults, so Vue's are still there.

::: warning Setting `storyMatch` yourself replaces the whole list
`storyMatch: ['**/*.story.tsx']` in a book that also has Vue stories drops the Vue ones: the book builds and reports fewer stories, with no warning. If you set the key to narrow where Poveste looks, name every kind of story in it. If a framework's stories are missing from the sidebar, check this key first.
:::

**One [setup file](../config.md#global-js-and-css) serves both.** Export each framework's function from it, `setupVue` beside `setupSolid`, and each runs only for its own framework's stories. Name the file `.tsx` if a wrapper in it returns JSX, and point [`setupFile`](../../reference/config.md#setupfile) at it:

```ts
// poveste.config.ts
export default defineConfig({
  plugins: [HstVue(), HstSolid()],
  setupFile: '/src/poveste.setup.tsx',
})
```

**Solid and React can share a book.** Both claim `.story.tsx` and `.story.jsx`, so a file goes to the plugin it imports: a story that imports `defineStory` from `@poveste/plugin-solid` is rendered by Solid, and one that imports it from `@poveste/plugin-react` by React, whichever comes first in `plugins`.

Two cases fall back to the plugin listed first in `plugins`, and Poveste says so once for that file when it finds the story:

- a story file that imports from both plugins;
- one that imports from neither, such as one that gets `defineStory` from a helper of your own. The warning names both plugins; import `defineStory` from one of them in the story file to choose.

The two Vite plugins also have to stay out of each other's files, since both compile JSX. Keep each framework's components in a directory of its own and point each plugin at it. If your `tsconfig` names Solid's JSX, give React its own:

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [
    solid({ include: 'src/solid/**' }),
    react({ include: /src\/react\/.*\.[jt]sx$/, jsxImportSource: 'react' }),
  ],
})
```

```ts
// poveste.config.ts
export default defineConfig({
  plugins: [HstSolid(), HstReact()],
})
```
