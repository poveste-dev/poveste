---
title: 'Official plugins — Vue, Nuxt, Svelte, Quasar, Solid, React, Tailwind and more'
description: 'The plugins Poveste publishes, what each one is for, and which you need for your framework.'
---

# Official Plugins

- [@poveste/plugin-vue](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-vue): Vue 3 (support plugin)
- [@poveste/plugin-nuxt](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-nuxt): Nuxt 4
- [@poveste/plugin-quasar](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-quasar): Quasar 2 (support plugin)
- [@poveste/plugin-svelte](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-svelte): Svelte 5 and SvelteKit
- [@poveste/plugin-solid](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-solid): SolidJS (renderer only)
- [@poveste/plugin-react](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-react): React 19 (renderer only)
- [@poveste/plugin-tailwind](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-tailwind): Renders a Tailwind design system as a story
- [@poveste/plugin-percy](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-percy): Visual regression testing with Percy
- [@poveste/plugin-screenshot](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-plugin-screenshot): Visual regression testing (simple)

## More than one framework in a book

One book can hold stories for two frameworks, such as a Vue library with a few Solid widgets, or a codebase halfway through a migration. Install each framework's Poveste plugin beside `poveste`:

```shell
pnpm i -D poveste @poveste/plugin-vue @poveste/plugin-solid
```

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

Each story is rendered by the plugin that claims its file: `.story.vue` by Vue, `.story.tsx` and `.story.jsx` by Solid. The two Vite plugins need no `include` or `exclude` to stay out of each other's way, since `vue()` compiles `.vue` files and `solid()` compiles JSX. Vue with React is the same, with `react()` and `HstReact()` in place of the Solid pair.

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

**Solid and React cannot share a book yet.** Both write stories as `.story.tsx`, and a file goes to whichever of the two plugins comes first in `plugins`. The other framework's stories then render nothing under Solid, or throw under React, and a `supportMatch` entry of your own does not change which plugin wins.
