---
title: 'App setup in Svelte — plugins and global state for stories'
description: 'Define a setup function so the Svelte app that renders your stories has the plugins, stores and globals your components expect.'
---

# App setup

## Global setup

You can define a setup function globally in a setup file. It is a file you create, and the
`setupFile` option in the global configuration names it ([learn more](../config.md#global-js-and-css)):

```ts
// poveste.config.ts
import { HstSvelte } from '@poveste/plugin-svelte'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstSvelte(),
  ],
  setupFile: '/src/poveste.setup.ts',
})
```

For Svelte the function is called `setupSvelte`. Poveste provides an optional `defineSetupSvelte`
helper to have better types in your IDE:

```ts
// src/poveste.setup.ts
import { defineSetupSvelte } from '@poveste/plugin-svelte'

export const setupSvelte = defineSetupSvelte(({ story, variant, setContext }) => {
  // Runs before every story and variant mounts
  document.documentElement.dataset.theme = 'dark'
  setContext('theme', 'dark')
})
```

::: tip
Importing global CSS or JS files at the top of the setup file — outside the hook — is the
most common use, and it does not need the hook at all. The file is a module like any other.
Import a stylesheet of your own, by its path from the setup file: `import './app.css'` for a
`src/app.css`. A file that does not exist fails the build, and the error names a story, not
the setup file.
:::

## If you already export a numbered name

`setupSvelte3`, `setupSvelte4` and `setupSvelte5` are all still accepted, and nothing needs
changing today. They are aliases of one hook, not separate hooks, so Poveste runs **the first
one it finds** and warns about the rest:

```ts
// Both of these are the same hook. Only `setupSvelte5` runs, and the warning says so.
export function setupSvelte5() { /* … */ }
export function setupSvelte() { /* … */ }
```

Established names win, so adding `setupSvelte` to a file that already exports `setupSvelte5`
changes nothing until you delete the old one. Rename when it suits you; keep one.

The numbers were always historical. `@poveste/plugin-svelte` supports Svelte 5 only, so
`setupSvelte3` and `setupSvelte4` name majors it cannot run — they are accepted because
histoire users wrote them, not because they select anything. The `defineSetupSvelte` helper is
unnumbered, and `defineSetupSvelte3` / `defineSetupSvelte4` / `defineSetupSvelte5` are aliases
of it.

## What the hook receives

| | |
| --- | --- |
| `story` | the story being rendered |
| `variant` | the variant, or `undefined` in the story-level mount that fills the controls panel, which calls only the global hook |
| `setContext` | puts a value in the context the story mounts with, where its components read it with `getContext` |

The hook runs **before the story mounts**, as it does in [the Vue page](../vue/app-setup.md), so anything it arranges is in place when your components initialise. Two consequences:

- **There is no `app`, and no `app.use()`, `app.component()` or `app.provide()`.** Nothing has mounted yet, and Svelte has no application-level plugin API to call. `setContext` is the part that has a Svelte counterpart.
- **The story's DOM doesn't exist yet.** A hook can't read what the story renders. To do something with the rendered story, do it from a component in the story, with `onMount`.

## Local setup

A variant can define a `setupApp` prop, called after the global hook with the same argument. Here
`variant` is always the variant it is defined on:

```svelte
<script>
  const { Hst } = $props()

  function setupApp({ variant }) {
    document.body.dataset.variant = variant.title
  }
</script>

<Hst.Story title="Story setup">
  <Hst.Variant title="Local setup" {setupApp}>
    <MyComponent />
  </Hst.Variant>
</Hst.Story>
```

## Examples

### Shared state

A Svelte store is an ordinary module, so a story imports it and nothing has to be registered:

```ts
// lib-store.ts
import { writable } from 'svelte/store'

export const myValue = writable(10)
```

```svelte
<!-- Store.svelte -->
<script lang="ts">
  import { myValue } from '../lib-store.js'
</script>

<button onclick={() => myValue.update(value => value + 1)}>+1</button>
<span>{$myValue}</span>
```

```svelte
<!-- Store.story.svelte -->
<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'
  import Store from './Store.svelte'

  const { Hst }: { Hst: HstType } = $props()
</script>

<Hst.Story title="Store">
  <Store />
</Hst.Story>
```

This is where Svelte is shorter than Vue rather than less capable: the [Vue page](../vue/app-setup.md#pinia)
registers Pinia in the setup file with `app.use()`, because a Pinia store needs an application
instance to attach to. A Svelte store does not, so there is no setup step to show.

The store is module state, so it is **shared across every story in the book** and survives
navigation between them. Give each story a fresh store if that matters — export a factory
rather than an instance, and call it in the story.

### Providing context

`setContext` is the closest thing to Vue's `app.provide()`, and the setup hook has it, so one call reaches every story:

```ts
export const setupSvelte = defineSetupSvelte(({ setContext }) => {
  setContext('theme', 'dark')
})
```

A variant's `setupApp` takes the same argument, for one story's value. To set context from a parent component instead, which is also how to wrap a story in markup, use a wrapper in the story:


```svelte
<!-- ThemeProvider.svelte -->
<script lang="ts">
  import { setContext } from 'svelte'

  const { theme = 'dark', children } = $props()

  setContext('theme', theme)
</script>

{@render children?.()}
```

```svelte
<!-- MyComponent.story.svelte -->
<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'
  import MyComponent from './MyComponent.svelte'
  import ThemeProvider from './ThemeProvider.svelte'

  const { Hst }: { Hst: HstType } = $props()
</script>

<Hst.Story title="With context">
  <ThemeProvider theme="dark">
    <MyComponent />
  </ThemeProvider>
</Hst.Story>
```

A component calling `getContext('theme')` with no provider above it gets `undefined`, which
usually surfaces further down as a property read on undefined rather than as a missing-context
error — so if a component works in your app and not in its story, this is the first thing to
check.

The same shape covers anything a component needs at construction. It is also what to reach for
until [`addWrapper`](./wrapper.md) exists (tracked in [#232](https://github.com/poveste-dev/poveste/issues/232)),
since there is no way to apply it to every story at once.

## SvelteKit

The setup file is configured the same way, under the `poveste` key of your Vite config — see
[SvelteKit](../sveltekit/getting-started.md):

```ts
export default defineConfig({
  plugins: [sveltekit()],
  poveste: {
    plugins: [HstSvelte()],
    setupFile: '/src/poveste.setup.ts',
  },
})
```

Poveste mounts your story component directly, so SvelteKit's routing is not involved: no
`+layout.svelte` wraps your story, and no `+page.ts` load runs. Anything a layout would have
provided has to come from the story — wrap the component under test in the story body, the
same as you would for any other provider.

## i18n

There is nothing special to do. A Svelte i18n library — or a hand-rolled `t()` — is an
ordinary module, not a framework plugin, so it has none of the sandbox trouble the [Nuxt
i18n guide](../nuxt/getting-started.md#i18n) describes: nothing gets booted through an app
entry, so nothing 500s the iframe. Import or initialise it like any other module (in a
`.ts` / `.svelte.ts` file, or in the setup file) and stories pick it up. `examples/svelte`
carries a minimal version.
